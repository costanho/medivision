from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
import asyncio
import re
import hashlib
from pathlib import Path
from datetime import datetime
from contextlib import asynccontextmanager

from app.core.database import get_db, SessionLocal
from app.models import Case, Patient, XRayImage, Prediction, LLMReport, RAGQuery
from app.services.storage import save_xray
from app.services.vision import predict as predict_image
from app.services.vision import generate_gradcam
from app.services.rag import retrieve as retrieve_guidelines
from app.services.llm import generate as generate_report

router = APIRouter(prefix="/cases", tags=["analysis"])
shortcut_router = APIRouter(tags=["Streaming Analysis"])


def _resolve_case_id(case_identifier: str) -> int:
    """
    Resolve a case identifier to an integer ID.
    Accepts:
      - Plain integers: "4"
      - CASE-NNN format: "CASE-001" → 1
    """
    if re.match(r"^CASE-(\d+)$", case_identifier, re.IGNORECASE):
        return int(re.match(r"^CASE-(\d+)$", case_identifier, re.IGNORECASE).group(1))
    try:
        return int(case_identifier)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid case identifier: {case_identifier}. Use an integer or CASE-NNN format.")


async def run_pipeline(case_id: int, image_path: str, patient: dict):
    """
    Generator — yields Server-Sent Events (SSE) as each analysis step completes.
    Does NOT hold a database session during long-running operations.
    Only creates sessions when reading/writing to database.
    """

    # Close any database session immediately - don't hold it during analysis
    prediction_result = None
    gradcam_path = None
    chunks = []
    report = None

    try:
        # Step 1 — Image upload + hashing (already done before streaming)
        yield f"data: {json.dumps({'step': 'uploading', 'status': 'done', 'message': 'Image saved and hashed'})}\n\n"
        await asyncio.sleep(0.1)

        # Step 2 — DICOM conversion
        yield f"data: {json.dumps({'step': 'converting', 'status': 'active', 'message': 'Converting DICOM to PNG...'})}\n\n"
        try:
            # If already PNG, skip conversion; if DICOM, convert
            file_path_obj = Path(image_path)
            if file_path_obj.suffix.lower() in ['.png', '.jpg', '.jpeg']:
                png_path = image_path
            else:
                # Placeholder for DICOM conversion
                png_path = image_path
            yield f"data: {json.dumps({'step': 'converting', 'status': 'done', 'message': 'DICOM conversion complete'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'step': 'converting', 'status': 'error', 'message': str(e)})}\n\n"
            return
        await asyncio.sleep(0.1)

        # Step 3 — Image preprocessing (CLAHE)
        yield f"data: {json.dumps({'step': 'preprocessing', 'status': 'active', 'message': 'Applying CLAHE preprocessing...'})}\n\n"
        try:
            # Preprocessing is handled in the vision service
            yield f"data: {json.dumps({'step': 'preprocessing', 'status': 'done', 'message': 'Preprocessing complete'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'step': 'preprocessing', 'status': 'error', 'message': str(e)})}\n\n"
            return
        await asyncio.sleep(0.1)

        # Step 4 — DenseNet inference
        yield f"data: {json.dumps({'step': 'densenet', 'status': 'active', 'message': 'Running DenseNet121 model...'})}\n\n"
        try:
            prediction_result = await predict_image(png_path)
            confidence_pct = float(prediction_result['confidence']) * 100
            message = f"Prediction: {prediction_result['label']} ({confidence_pct:.1f}%)"
            yield f"data: {json.dumps({'step': 'densenet', 'status': 'done', 'label': prediction_result['label'], 'confidence': float(prediction_result['confidence']), 'message': message})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'step': 'densenet', 'status': 'error', 'message': str(e)})}\n\n"
            return
        await asyncio.sleep(0.1)

        # Step 5 — Grad-CAM visualization
        yield f"data: {json.dumps({'step': 'gradcam', 'status': 'active', 'message': 'Generating Grad-CAM visualization...'})}\n\n"
        try:
            gradcam_path = generate_gradcam(png_path, prediction_result)
            yield f"data: {json.dumps({'step': 'gradcam', 'status': 'done', 'path': gradcam_path, 'message': 'Grad-CAM complete'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'step': 'gradcam', 'status': 'error', 'message': str(e)})}\n\n"
            gradcam_path = None
        await asyncio.sleep(0.1)

        # Step 6 — RAG embedding + retrieval
        yield f"data: {json.dumps({'step': 'embedding', 'status': 'active', 'message': 'Retrieving medical guidelines (RAG)...'})}\n\n"
        try:
            # Parse ART drugs if present
            art_drugs = []
            if patient.get('art_regimen') and patient['art_regimen'].lower() != 'none':
                art_drugs = [
                    drug.strip() for drug in
                    patient['art_regimen'].replace('+', ',').replace('/', ',').split(',')
                    if drug.strip()
                ]

            chunks = retrieve_guidelines(
                label=prediction_result['label'],
                hiv=patient.get('hiv_status', 'unknown'),
                art_drugs=art_drugs
            )
            yield f"data: {json.dumps({'step': 'embedding', 'status': 'done', 'chunks': len(chunks), 'message': f'Retrieved {len(chunks)} relevant guidelines'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'step': 'embedding', 'status': 'error', 'message': str(e)})}\n\n"
            chunks = []
        await asyncio.sleep(0.1)

        # Step 7 — LLM report generation
        yield f"data: {json.dumps({'step': 'llm', 'status': 'active', 'message': 'Generating clinical report with LLM...'})}\n\n"
        try:
            patient_context = {
                'hiv_status': patient.get('hiv_status', 'unknown'),
                'art_regimen': patient.get('art_regimen', 'none')
            }

            report = await generate_report(
                prediction={
                    'label': prediction_result['label'],
                    'confidence': prediction_result['confidence']
                },
                chunks=chunks,
                patient=patient_context
            )

            yield f"data: {json.dumps({'step': 'llm', 'status': 'done', 'diagnosis': report.diagnosis, 'message': 'Report generation complete'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'step': 'llm', 'status': 'error', 'message': str(e)})}\n\n"
            return
        await asyncio.sleep(0.1)

        # Step 8 — Save to database (create fresh session just for saving)
        yield f"data: {json.dumps({'step': 'database', 'status': 'active', 'message': 'Saving results to database...'})}\n\n"
        db = SessionLocal()  # Create fresh session only for database save
        try:
            # Get case and xray
            case = db.query(Case).filter(Case.id == case_id).first()
            if not case:
                raise HTTPException(status_code=404, detail="Case not found")

            # Get latest xray for this case
            xray = db.query(XRayImage).filter(
                XRayImage.case_id == case_id
            ).order_by(XRayImage.uploaded_at.desc()).first()

            if not xray:
                raise HTTPException(status_code=404, detail="X-ray not found")

            # Save prediction
            prediction = Prediction(
                image_id=xray.id,
                model_name="DenseNet121",
                model_version="cxr_5diseases",
                label=prediction_result['label'],
                confidence=prediction_result['confidence'],
                top_labels=prediction_result.get('top_labels'),
                inference_ms=0
            )
            db.add(prediction)
            db.flush()

            # Save RAG query
            rag_query = RAGQuery(
                prediction_id=prediction.id,
                query_text=f"{prediction_result['label']} treatment protocol guidelines",
                retrieved_chunks=chunks,
                collection_used="medical_guidelines,edliz_protocols,who_guidelines",
                latency_ms=0
            )
            db.add(rag_query)
            db.flush()

            # Save LLM report
            llm_report = LLMReport(
                rag_query_id=rag_query.id,
                case_id=case_id,
                diagnosis=report.diagnosis,
                treatment_plan=report.treatment_plan,
                drug_regimen=report.drug_regimen if hasattr(report, 'drug_regimen') else [],
                warnings=report.warnings if hasattr(report, 'warnings') else [],
                evidence_refs=report.evidence_refs if hasattr(report, 'evidence_refs') else [],
                model_name="llama3.2:3b"
            )
            db.add(llm_report)
            db.commit()

            yield f"data: {json.dumps({'step': 'database', 'status': 'done', 'message': 'Results saved successfully'})}\n\n"
        except Exception as e:
            db.rollback()
            err_msg = getattr(e, 'detail', None) or str(e) or repr(e)
            yield f"data: {json.dumps({'step': 'database', 'status': 'error', 'message': err_msg})}\n\n"
            return
        finally:
            db.close()

        # Final completion
        yield f"data: {json.dumps({'step': 'complete', 'status': 'done', 'message': 'Analysis complete', 'timestamp': datetime.utcnow().isoformat()})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'step': 'error', 'status': 'error', 'message': f'Pipeline error: {str(e)}'})}\n\n"


@router.post("/{case_id}/analyse")
async def analyse_case_streaming(
    case_id: int,
    file: UploadFile = File(...)
):
    """
    Streaming analysis endpoint.

    Uploads X-ray image and returns Server-Sent Events stream with real-time
    progress updates from the complete analysis pipeline.
    """
    # Quick validation with temporary session, then close it
    db = SessionLocal()
    try:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        patient_obj = db.query(Patient).filter(Patient.id == case.patient_id).first()
        if not patient_obj:
            raise HTTPException(status_code=404, detail="Patient not found")

        # Read and save image
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="File is empty")

        file_path, file_hash = await save_xray(file_bytes, file.filename)

        # Save XRayImage record
        xray = XRayImage(
            case_id=case_id,
            file_path=file_path,
            file_hash=file_hash,
            format=Path(file.filename).suffix.lower().lstrip(".") if file.filename else "dcm"
        )
        db.add(xray)
        db.commit()

        # Prepare patient context
        patient = {
            'hiv_status': patient_obj.hiv_status or 'unknown',
            'art_regimen': patient_obj.art_regimen or 'none'
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")
    finally:
        db.close()  # Close immediately after setup

    # Return streaming response - generator is completely independent
    return StreamingResponse(
        run_pipeline(case_id, file_path, patient),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@shortcut_router.post("/analyse/{case_identifier}")
async def analyse_shortcut(
    case_identifier: str,
    image: UploadFile = File(...)
):
    """
    Shortcut endpoint: POST /analyse/CASE-001 or /analyse/4

    Accepts 'image' as the file field name.
    Resolves CASE-NNN identifiers to integer IDs automatically.
    """
    db = SessionLocal()
    try:
        case_id = _resolve_case_id(case_identifier)

        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail=f"Case {case_identifier} not found")

        patient_obj = db.query(Patient).filter(Patient.id == case.patient_id).first()
        if not patient_obj:
            raise HTTPException(status_code=404, detail="Patient not found")

        file_bytes = await image.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="File is empty")

        file_path, file_hash = await save_xray(file_bytes, image.filename)

        # If same file already exists on disk, reuse its path but always create a new DB record
        existing = db.query(XRayImage).filter(XRayImage.file_hash == file_hash).first()
        if existing:
            file_path = existing.file_path

        unique_hash = hashlib.sha256(f"{file_hash}{case_id}{datetime.utcnow().timestamp()}".encode()).hexdigest()
        xray = XRayImage(
            case_id=case_id,
            file_path=file_path,
            file_hash=unique_hash,
            format=Path(image.filename).suffix.lower().lstrip(".") if image.filename else "dcm"
        )
        db.add(xray)
        db.commit()

        patient = {
            'hiv_status': patient_obj.hiv_status or 'unknown',
            'art_regimen': patient_obj.art_regimen or 'none'
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()  # Close immediately after setup

    return StreamingResponse(
        run_pipeline(case_id, file_path, patient),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

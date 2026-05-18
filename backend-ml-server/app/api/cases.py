from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime

from app.core.database import get_db
from app.models import Case, Patient, XRayImage, Prediction
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate
from app.schemas.xray import XRayImageResponse, XRayUploadResponse, PredictionResponse, AnalysisRequest
from app.schemas.llm import TreatmentReport, ReportGenerationRequest, ReportGenerationResponse
from app.services.storage import save_xray
from app.services.vision import predict as predict_image
from app.services.rag import retrieve as retrieve_guidelines
from app.services.llm import generate as generate_report

router = APIRouter(prefix="/cases", tags=["cases"])


@router.post("/", response_model=CaseResponse)
def create_case(case: CaseCreate, db: Session = Depends(get_db)):
    """Create a new case for a patient"""
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == case.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db_case = Case(**case.dict())
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, db: Session = Depends(get_db)):
    """Get a case by ID"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("/", response_model=list[CaseResponse])
def list_cases(patient_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List cases with optional filtering by patient"""
    query = db.query(Case)
    if patient_id:
        query = query.filter(Case.patient_id == patient_id)
    cases = query.offset(skip).limit(limit).all()
    return cases


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, case_update: CaseUpdate, db: Session = Depends(get_db)):
    """Update case status or clinical notes"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    update_data = case_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)

    db.commit()
    db.refresh(case)
    return case


@router.post("/{case_id}/upload", response_model=XRayUploadResponse)
async def upload_xray(case_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload X-ray image for a case.

    - Saves to /data/xrays with SHA-256 deduplication
    - Stores file path and hash in database
    """
    # Verify case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Read file
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File is empty")

    # Save file to disk
    try:
        file_path, file_hash = await save_xray(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Determine file format from extension
    file_format = Path(file.filename).suffix.lower().lstrip(".")
    if not file_format:
        file_format = "dcm"

    # Save to database
    xray = XRayImage(
        case_id=case_id,
        file_path=file_path,
        file_hash=file_hash,
        format=file_format
    )
    db.add(xray)
    db.commit()
    db.refresh(xray)

    return XRayUploadResponse(
        id=xray.id,
        case_id=xray.case_id,
        file_path=xray.file_path,
        file_hash=xray.file_hash,
        format=xray.format,
        uploaded_at=xray.uploaded_at,
        message=f"X-ray successfully uploaded and saved to {file_path}"
    )


@router.get("/{case_id}/xrays", response_model=list[XRayImageResponse])
def get_case_xrays(case_id: int, db: Session = Depends(get_db)):
    """Get all X-ray images for a case"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    xrays = db.query(XRayImage).filter(XRayImage.case_id == case_id).all()
    return xrays


@router.post("/analyse", response_model=PredictionResponse)
async def analyse_xray(request: AnalysisRequest, db: Session = Depends(get_db)):
    """
    Analyze an X-ray image using the vision model.

    - Accepts xray_id (required) or case_id + search for latest xray
    - Runs DenseNet121 model inference
    - Generates Grad-CAM visualization
    - Stores predictions in database
    - Returns: { label, confidence, top_labels, gradcam_path }
    """
    # Determine which X-ray to analyze
    xray = None

    if request.xray_id:
        xray = db.query(XRayImage).filter(XRayImage.id == request.xray_id).first()
        if not xray:
            raise HTTPException(status_code=404, detail="X-ray not found")
    elif request.case_id:
        # Get the latest X-ray for this case
        case = db.query(Case).filter(Case.id == request.case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        xray = (
            db.query(XRayImage)
            .filter(XRayImage.case_id == request.case_id)
            .order_by(XRayImage.uploaded_at.desc())
            .first()
        )
        if not xray:
            raise HTTPException(status_code=404, detail="No X-rays found for this case")
    else:
        raise HTTPException(status_code=400, detail="Either xray_id or case_id is required")

    # Verify X-ray file exists
    xray_file = Path(xray.file_path)
    if not xray_file.exists():
        raise HTTPException(status_code=404, detail="X-ray file not found on disk")

    # Run prediction
    try:
        prediction_result = await predict_image(str(xray_file))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    # Update X-ray with Grad-CAM path
    xray.gradcam_path = prediction_result["gradcam_path"]
    db.commit()

    # Store prediction in database
    prediction = Prediction(
        xray_id=xray.id,
        label=prediction_result["label"],
        confidence=prediction_result["confidence"],
        model_version="densenet121_cxr",
        metadata={
            "top_labels": prediction_result["top_labels"],
            "gradcam_path": prediction_result["gradcam_path"]
        }
    )
    db.add(prediction)
    db.commit()

    return PredictionResponse(
        label=prediction_result["label"],
        confidence=prediction_result["confidence"],
        top_labels=[
            {"label": item["label"], "score": item["score"]}
            for item in prediction_result["top_labels"]
        ],
        gradcam_path=prediction_result["gradcam_path"]
    )


@router.post("/{case_id}/report", response_model=ReportGenerationResponse)
async def generate_clinical_report(
    case_id: int,
    request: ReportGenerationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate structured clinical treatment report using LLM.

    - Retrieves latest prediction for the case
    - Fetches relevant medical guidelines via RAG
    - Generates structured treatment plan using Ollama/Mistral
    - Returns: diagnosis, treatment_plan, drug_regimen, warnings, evidence_refs

    Requires Ollama running with Mistral model:
      ollama pull llama3.2:3b
      ollama serve
    """
    # Verify case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Get the patient info
    patient = db.query(Patient).filter(Patient.id == case.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Prepare patient context for LLM
    patient_context = {
        "hiv_status": request.hiv_status or "unknown",
        "art_regimen": request.art_regimen or "none"
    }

    # Prepare prediction dict for LLM
    prediction = {
        "label": request.prediction_label,
        "confidence": request.prediction_confidence
    }

    # Retrieve relevant guidelines from knowledge base
    try:
        # Parse ART drugs if provided in art_regimen string
        art_drugs = []
        if request.art_regimen and request.art_regimen.lower() != "none":
            # Simple split on common separators
            art_drugs = [
                drug.strip() for drug in
                request.art_regimen.replace("+", ",").replace("/", ",").split(",")
                if drug.strip()
            ]

        chunks = retrieve_guidelines(
            label=request.prediction_label,
            hiv=request.hiv_status or "negative",
            art_drugs=art_drugs
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RAG retrieval failed: {str(e)}"
        )

    # Generate treatment report using LLM
    try:
        report = await generate_report(
            prediction=prediction,
            chunks=chunks,
            patient=patient_context
        )
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM service error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed. Ensure Ollama is running with Mistral model. Error: {str(e)}"
        )

    return ReportGenerationResponse(
        case_id=case_id,
        report=report,
        generated_at=datetime.utcnow().isoformat()
    )

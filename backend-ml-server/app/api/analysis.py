"""
Phase 7: Unified Analysis Endpoint

Orchestrates the complete workflow:
1. Image upload and storage
2. Vision model prediction
3. Patient context retrieval
4. RAG guideline retrieval
5. LLM clinical report generation
6. Database record creation
7. Audit logging

This is the primary endpoint for end-to-end analysis.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import time

from app.core.database import get_db
from app.models.models import (
    Case, Patient, XRayImage, Prediction, RAGQuery, LLMReport, AuditLog
)
from app.services.storage import save_xray
from app.services.vision import predict as predict_image
from app.services.rag import retrieve as retrieve_guidelines
from app.services.llm import generate as generate_report

router = APIRouter(prefix="/cases", tags=["analysis"])


class AnalysisResponse:
    """Response model for complete analysis"""
    def __init__(self, prediction, report, metadata):
        self.prediction = prediction
        self.report = report
        self.metadata = metadata

    def dict(self):
        return {
            "prediction": self.prediction,
            "report": self.report,
            "metadata": self.metadata
        }


@router.post("/{case_id}/analyse")
async def analyse_case(
    case_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Complete end-to-end analysis: upload X-ray → predict → retrieve guidelines → generate report.

    Orchestrates all Phase 3-6 services:
    - Vision model for disease classification
    - RAG engine for protocol retrieval
    - LLM for clinical report generation

    Returns:
    {
        "prediction": {"label", "confidence", "top_labels", "gradcam_path"},
        "report": {"diagnosis", "treatment_plan", "drug_regimen", "warnings", "evidence_refs"},
        "metadata": {"case_id", "timing", "versions"}
    }
    """
    start_time = time.time()

    # ===== STEP 1: Verify case exists =====
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # ===== STEP 2: Get patient context =====
    patient = db.query(Patient).filter(Patient.id == case.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # ===== STEP 3: Save X-ray image =====
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="File is empty")

        file_path, file_hash = await save_xray(file_bytes, file.filename)

        # Determine file format
        file_format = file.filename.split(".")[-1].lower() if file.filename else "dcm"
        if file_format not in ["dcm", "jpg", "jpeg", "png"]:
            file_format = "dcm"

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save X-ray: {str(e)}")

    # Save to database
    xray = XRayImage(
        case_id=case_id,
        file_path=file_path,
        file_hash=file_hash,
        format=file_format
    )
    db.add(xray)
    db.flush()

    # ===== STEP 4: Vision prediction =====
    try:
        vision_start = time.time()
        prediction_result = await predict_image(file_path)
        vision_latency = int((time.time() - vision_start) * 1000)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision prediction failed: {str(e)}")

    # Store prediction in database
    prediction = Prediction(
        image_id=xray.id,
        model_name="DenseNet121",
        model_version="cxr_5diseases",
        label=prediction_result["label"],
        confidence=prediction_result["confidence"],
        top_labels=prediction_result["top_labels"],
        inference_ms=vision_latency
    )
    db.add(prediction)
    db.flush()

    # Update X-ray with Grad-CAM path
    xray.gradcam_path = prediction_result.get("gradcam_path")
    db.flush()

    # ===== STEP 5: RAG retrieval =====
    try:
        rag_start = time.time()

        # Parse ART drugs if present
        art_drugs = []
        if patient.art_regimen:
            art_drugs = [d.strip() for d in patient.art_regimen.replace("+", ",").replace("/", ",").split(",") if d.strip()]

        # Retrieve relevant guidelines
        chunks = retrieve_guidelines(
            label=prediction_result["label"],
            hiv=patient.hiv_status or "unknown",
            art_drugs=art_drugs
        )

        rag_latency = int((time.time() - rag_start) * 1000)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG retrieval failed: {str(e)}")

    # Store RAG query in database
    rag_query = RAGQuery(
        prediction_id=prediction.id,
        query_text=f"{prediction_result['label']} treatment protocol Zimbabwe EDLIZ guidelines",
        retrieved_chunks=chunks,
        collection_used="medical_guidelines,edliz_protocols,who_guidelines,drug_interactions",
        latency_ms=rag_latency
    )
    db.add(rag_query)
    db.flush()

    # ===== STEP 6: LLM report generation =====
    try:
        llm_start = time.time()

        # Prepare patient context for LLM
        patient_context = {
            "hiv_status": patient.hiv_status or "unknown",
            "art_regimen": patient.art_regimen or "none"
        }

        # Generate report
        report = await generate_report(
            prediction={
                "label": prediction_result["label"],
                "confidence": prediction_result["confidence"]
            },
            chunks=chunks,
            patient=patient_context
        )

    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM service error: {str(e)}. Ensure ollama library is installed."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM report generation failed: {str(e)}"
        )

    # Store LLM report in database
    llm_report = LLMReport(
        rag_query_id=rag_query.id,
        case_id=case_id,
        diagnosis=report.diagnosis,
        treatment_plan=report.treatment_plan,
        drug_regimen=report.drug_regimen,
        warnings=report.warnings,
        evidence_refs=report.evidence_refs,
        model_name="llama3.2:3b"
    )
    db.add(llm_report)
    db.flush()

    # ===== STEP 7: Audit logging =====
    try:
        audit_log = AuditLog(
            actor_id=case.doctor_id,
            actor_role="doctor",
            action="RUN_COMPLETE_ANALYSIS",
            resource_type="case",
            resource_id=case_id
        )
        db.add(audit_log)
    except Exception as e:
        # Log audit error but don't fail the analysis
        print(f"Warning: Failed to create audit log: {str(e)}")

    # ===== Commit all changes =====
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit failed: {str(e)}")

    # ===== Prepare response =====
    total_latency = int((time.time() - start_time) * 1000)

    response = {
        "case_id": case_id,
        "prediction": {
            "label": prediction_result["label"],
            "confidence": float(prediction_result["confidence"]),
            "top_labels": prediction_result.get("top_labels", []),
            "gradcam_path": prediction_result.get("gradcam_path")
        },
        "report": {
            "diagnosis": report.diagnosis,
            "treatment_plan": report.treatment_plan,
            "drug_regimen": report.drug_regimen,
            "warnings": report.warnings,
            "evidence_refs": report.evidence_refs
        },
        "metadata": {
            "case_id": case_id,
            "patient_hiv_status": patient.hiv_status,
            "patient_art_regimen": patient.art_regimen,
            "xray_id": xray.id,
            "prediction_id": prediction.id,
            "rag_query_id": rag_query.id,
            "llm_report_id": llm_report.id,
            "timing": {
                "vision_ms": vision_latency,
                "rag_ms": rag_latency,
                "total_ms": total_latency
            },
            "models": {
                "vision": "DenseNet121_cxr_5diseases",
                "embeddings": "sentence-transformers/all-MiniLM-L6-v2",
                "llm": "llama3.2:3b"
            },
            "analysis_timestamp": datetime.utcnow().isoformat()
        }
    }

    return response

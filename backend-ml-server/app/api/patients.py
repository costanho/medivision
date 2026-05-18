from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Patient
from app.schemas.patient import PatientCreate, PatientResponse

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("/", response_model=PatientResponse)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    """Create a new patient"""
    # Check if patient already exists
    existing = db.query(Patient).filter(
        Patient.national_id == patient.national_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Patient with national_id {patient.national_id} already exists"
        )

    db_patient = Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    """Get a patient by ID"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@router.get("/", response_model=list[PatientResponse])
def list_patients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all patients with pagination"""
    patients = db.query(Patient).offset(skip).limit(limit).all()
    return patients


@router.get("/search/national_id/{national_id}", response_model=PatientResponse)
def get_patient_by_national_id(national_id: str, db: Session = Depends(get_db)):
    """Get a patient by national ID"""
    patient = db.query(Patient).filter(Patient.national_id == national_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient

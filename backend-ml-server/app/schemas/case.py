from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CaseCreate(BaseModel):
    patient_id: int
    doctor_id: Optional[int] = None
    clinical_notes: Optional[str] = None

class CaseResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    status: str
    clinical_notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    clinical_notes: Optional[str] = None

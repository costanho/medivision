from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class PatientCreate(BaseModel):
    national_id: str
    full_name: str
    dob: Optional[date] = None
    sex: Optional[str] = None
    hiv_status: Optional[str] = "unknown"
    art_regimen: Optional[str] = None
    facility_id: Optional[str] = None

class PatientResponse(BaseModel):
    id: int
    national_id: str
    full_name: str
    dob: Optional[date] = None
    sex: Optional[str] = None
    hiv_status: str
    art_regimen: Optional[str] = None
    facility_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

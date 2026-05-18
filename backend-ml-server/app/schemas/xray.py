from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PredictionLabel(BaseModel):
    label: str
    score: float

class PredictionResponse(BaseModel):
    """Vision model prediction response"""
    label: str
    confidence: float
    top_labels: list[PredictionLabel]
    gradcam_path: str

class AnalysisRequest(BaseModel):
    """Request for X-ray analysis - can pass xray_id or case_id"""
    xray_id: Optional[int] = None
    case_id: Optional[int] = None

class XRayImageResponse(BaseModel):
    id: int
    case_id: int
    file_path: str
    file_hash: str
    format: Optional[str] = None
    gradcam_path: Optional[str] = None
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class XRayUploadResponse(BaseModel):
    id: int
    case_id: int
    file_path: str
    file_hash: str
    format: str
    uploaded_at: Optional[datetime] = None
    message: str

    class Config:
        from_attributes = True

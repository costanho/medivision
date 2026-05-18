from pydantic import BaseModel
from typing import Optional


class DrugRegimen(BaseModel):
    """Drug dosing information"""
    name: str
    dose: str
    duration: str
    frequency: str


class Warning(BaseModel):
    """Clinical warning or contraindication"""
    type: str  # e.g., "drug-drug-interaction", "contraindication", "adverse-effect"
    description: str
    interaction_with: Optional[str] = None


class EvidenceRef(BaseModel):
    """Reference to source protocol excerpt"""
    source: str
    relevance_score: float
    key_excerpt: str


class TreatmentReport(BaseModel):
    """Structured clinical treatment recommendation from LLM"""
    diagnosis: str
    treatment_plan: str
    drug_regimen: list[DrugRegimen]
    warnings: list[Warning]
    evidence_refs: list[EvidenceRef]


class ReportGenerationRequest(BaseModel):
    """Request to generate clinical treatment report"""
    case_id: int
    prediction_label: str  # Disease diagnosis from vision model
    prediction_confidence: float  # Confidence score (0-1)
    hiv_status: Optional[str] = None  # "positive", "negative", or None
    art_regimen: Optional[str] = None  # Current ART drugs if HIV+


class ReportGenerationResponse(BaseModel):
    """Response with generated treatment report"""
    case_id: int
    report: TreatmentReport
    generated_at: str  # ISO timestamp

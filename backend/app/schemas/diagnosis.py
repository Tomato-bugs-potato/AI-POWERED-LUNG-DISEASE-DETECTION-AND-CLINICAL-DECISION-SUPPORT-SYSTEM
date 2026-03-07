from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from app.db.base import PrimaryDiagnosis, UrgencyLevel

class DiagnosisCreate(BaseModel):
    primary_diagnosis: PrimaryDiagnosis
    diagnosis_notes: str
    urgency_level: UrgencyLevel
    treatment_recommendations: Optional[str] = None

class DiagnosisResponse(BaseModel):
    diagnosis_id: uuid.UUID
    case_id: uuid.UUID
    doctor_id: uuid.UUID
    primary_diagnosis: PrimaryDiagnosis
    diagnosis_notes: str
    urgency_level: UrgencyLevel
    treatment_recommendations: Optional[str] = None
    diagnosed_at: datetime

    class Config:
        from_attributes = True

class DiagnosisDraftCreate(BaseModel):
    primary_diagnosis: Optional[PrimaryDiagnosis] = None
    diagnosis_notes: Optional[str] = None
    urgency_level: Optional[UrgencyLevel] = None
    treatment_recommendations: Optional[str] = None

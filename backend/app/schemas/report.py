from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import uuid

class ReportPatientInfo(BaseModel):
    patient_id: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None

class ReportDoctorInfo(BaseModel):
    name: Optional[str] = None
    final_diagnosis: Optional[str] = None
    recommendations: Optional[str] = None

class ReportRadiologistInfo(BaseModel):
    name: Optional[str] = None
    findings: Optional[str] = None

class ReportAIInfo(BaseModel):
    model_version: Optional[str] = None
    primary_finding: Optional[str] = None
    confidence: Optional[float] = 0

class ReportResponse(BaseModel):
    report_id: uuid.UUID
    case_id: uuid.UUID
    pdf_url: Optional[str] = None
    generated_at: datetime
    generated_by: uuid.UUID
    file_size_bytes: Optional[int] = None
    cached: bool
    # Enriched fields joined from Case/Diagnosis — optional for backwards compat
    patient_id: Optional[uuid.UUID] = None
    final_diagnosis: Optional[str] = None
    status: str = "Final"
    # Full nested objects for report detail view
    patient: Optional[ReportPatientInfo] = None
    doctor: Optional[ReportDoctorInfo] = None
    radiologist: Optional[ReportRadiologistInfo] = None
    ai_inference: Optional[ReportAIInfo] = None

    class Config:
        from_attributes = True

class ReportStatusResponse(BaseModel):
    status: str # "generating" | "ready" | "failed"
    report_id: Optional[uuid.UUID] = None

from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid
from app.db.base import CaseStatus, UrgencyLevel
from app.schemas.patient import PatientResponse
from app.schemas.user import UserResponse
from app.schemas.image import ImageResponse

class CaseCreate(BaseModel):
    patient_id: uuid.UUID
    visit_date: date
    linked_case_id: Optional[uuid.UUID] = None

class CaseStatusUpdate(BaseModel):
    status: CaseStatus

class CaseResponse(BaseModel):
    case_id: uuid.UUID
    patient_id: uuid.UUID
    upload_tech_id: Optional[uuid.UUID] = None
    linked_case_id: Optional[uuid.UUID] = None
    visit_date: date
    status: CaseStatus
    priority: Optional[UrgencyLevel] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CaseDetailResponse(CaseResponse):
    patient: Optional[PatientResponse] = None
    upload_tech: Optional[UserResponse] = None
    images: list[ImageResponse] = []
    
    class Config:
        from_attributes = True

from datetime import date, datetime
from typing import Optional
import uuid
from pydantic import BaseModel
from app.db.base import PatientSex

class PatientBase(BaseModel):
    age: int
    sex: PatientSex
    consent_recorded: bool

class PatientCreate(PatientBase):
    # Optional explicitly provided ID if sync with hospital systems
    patient_id: Optional[uuid.UUID] = None
    visit_date: date

class PatientResponse(PatientBase):
    patient_id: uuid.UUID
    registered_at: datetime
    consent_date: Optional[datetime] = None

    class Config:
        from_attributes = True

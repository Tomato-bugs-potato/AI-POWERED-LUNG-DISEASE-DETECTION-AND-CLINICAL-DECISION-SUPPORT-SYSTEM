from datetime import date, datetime
import uuid
from typing import Optional, List, TYPE_CHECKING
from pydantic import BaseModel
from app.db.base import PatientSex

if TYPE_CHECKING:
    from app.schemas.case import CaseResponse

class PatientBase(BaseModel):
    age: int
    sex: PatientSex
    consent_recorded: bool

class PatientCreate(PatientBase):
    # Optional explicitly provided ID if sync with hospital systems
    patient_id: Optional[uuid.UUID] = None
    visit_date: date
    symptoms: Optional[str] = None

class PatientResponse(PatientBase):
    patient_id: uuid.UUID
    registered_at: datetime
    consent_date: Optional[datetime] = None
    symptoms: Optional[str] = None
    # Computed fields — populated when cases are eagerly loaded in endpoints
    cases: List["CaseResponse"] = []
    total_cases: int = 0
    active_cases: int = 0
    last_visit_date: Optional[date] = None
    created_at: Optional[datetime] = None  # alias for registered_at

    class Config:
        from_attributes = True

class PatientSummaryResponse(PatientBase):
    """Minimal patient info for nesting in Case responses without infinite history."""
    patient_id: uuid.UUID
    registered_at: datetime
    consent_date: Optional[datetime] = None
    symptoms: Optional[str] = None
    total_cases: int = 0
    active_cases: int = 0
    last_visit_date: Optional[date] = None

    class Config:
        from_attributes = True

# Resolve forward references
from app.schemas.case import CaseResponse
PatientResponse.model_rebuild()

import uuid
from typing import TYPE_CHECKING, Optional
from datetime import date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, Enum, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, PatientSex, CaseStatus

if TYPE_CHECKING:
    from app.models.case import Case

class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    sex: Mapped[PatientSex] = mapped_column(Enum(PatientSex), nullable=False)
    symptoms: Mapped[str | None] = mapped_column(Text, nullable=True)

    registered_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    consent_recorded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_date: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)

    # NFR-25 Privacy requirement: No Full Name or address stored in database.

    # Relationships
    cases: Mapped[list["Case"]] = relationship("Case", back_populates="patient", cascade="all, delete-orphan")

    # Computed properties — populated when cases are eagerly loaded
    @property
    def total_cases(self) -> int:
        if "cases" in self.__dict__:
            return len(self.__dict__["cases"])
        return 0

    @property
    def active_cases(self) -> int:
        active_statuses = {
            CaseStatus.Pending_Review,
            CaseStatus.In_Review,
            CaseStatus.Ready_for_Diagnosis,
        }
        if "cases" in self.__dict__:
            return sum(1 for c in self.__dict__["cases"] if c.status in active_statuses)
        return 0

    @property
    def last_visit_date(self) -> Optional[date]:
        if "cases" in self.__dict__:
            dates = [c.visit_date for c in self.__dict__["cases"] if c.visit_date]
            return max(dates) if dates else None
        return None

    @property
    def created_at(self):
        return self.registered_at

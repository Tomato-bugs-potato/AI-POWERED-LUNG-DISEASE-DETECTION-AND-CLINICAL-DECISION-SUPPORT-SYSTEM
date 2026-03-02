import uuid
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, Enum, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, PatientSex

if TYPE_CHECKING:
    from app.models.case import Case

class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    sex: Mapped[PatientSex] = mapped_column(Enum(PatientSex), nullable=False)
    
    registered_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    consent_recorded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_date: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)

    # NFR-25 Privacy requirement: No Full Name or address stored in database.

    # Relationships
    cases: Mapped[list["Case"]] = relationship("Case", back_populates="patient", cascade="all, delete-orphan")

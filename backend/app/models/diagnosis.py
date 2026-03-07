import uuid
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, PrimaryDiagnosis, UrgencyLevel
from app.core.encryption import EncryptedText

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.user import User

class Diagnosis(Base):
    __tablename__ = "diagnoses"

    diagnosis_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.case_id"), unique=True, nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    
    primary_diagnosis: Mapped[PrimaryDiagnosis] = mapped_column(Enum(PrimaryDiagnosis), nullable=False)
    
    diagnosis_notes: Mapped[str] = mapped_column(EncryptedText, nullable=False)
    
    urgency_level: Mapped[UrgencyLevel] = mapped_column(Enum(UrgencyLevel), nullable=False)
    
    treatment_recommendations: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    
    diagnosed_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="diagnosis")
    doctor: Mapped["User"] = relationship("User", back_populates="diagnoses")

import uuid
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum, DateTime, Date, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, CaseStatus, UrgencyLevel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.patient import Patient
    from app.models.image import Image
    from app.models.radiologist_review import RadiologistReview
    from app.models.diagnosis import Diagnosis
    from app.models.report import Report
    from app.models.audit_log import AuditLog

class Case(Base):
    __tablename__ = "cases"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.patient_id"), index=True, nullable=False)
    upload_tech_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    linked_case_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=True)
    
    visit_date: Mapped[Date] = mapped_column(Date, nullable=False)
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus), default=CaseStatus.Pending_Review, index=True, nullable=False)
    priority: Mapped[UrgencyLevel | None] = mapped_column(Enum(UrgencyLevel), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="cases")
    upload_tech: Mapped["User | None"] = relationship("User", back_populates="cases")
    linked_case: Mapped["Case | None"] = relationship("Case", remote_side=[case_id])

    images: Mapped[list["Image"]] = relationship("Image", back_populates="case", cascade="all, delete-orphan")
    radiologist_review: Mapped["RadiologistReview | None"] = relationship("RadiologistReview", back_populates="case", uselist=False, cascade="all, delete-orphan")
    diagnosis: Mapped["Diagnosis | None"] = relationship("Diagnosis", back_populates="case", uselist=False, cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="case", cascade="all, delete-orphan")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="case")

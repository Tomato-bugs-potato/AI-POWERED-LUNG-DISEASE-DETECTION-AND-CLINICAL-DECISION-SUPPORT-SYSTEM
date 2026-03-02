import uuid
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, Role, UserStatus

if TYPE_CHECKING:
    from app.models.hospital import Hospital
    from app.models.case import Case
    from app.models.radiologist_review import RadiologistReview
    from app.models.diagnosis import Diagnosis
    from app.models.report import Report
    from app.models.audit_log import AuditLog
    from app.models.session import Session

class User(Base):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hospital_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("hospitals.hospital_id"), nullable=True)
    
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.Active, nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    last_login: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="users")
    
    cases: Mapped[list["Case"]] = relationship("Case", back_populates="upload_tech")
    radiologist_reviews: Mapped[list["RadiologistReview"]] = relationship("RadiologistReview", back_populates="radiologist")
    diagnoses: Mapped[list["Diagnosis"]] = relationship("Diagnosis", back_populates="doctor")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="doctor")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")

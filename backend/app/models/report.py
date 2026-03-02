import uuid
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.user import User

class Report(Base):
    __tablename__ = "reports"

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=False)
    
    pdf_url: Mapped[str | None] = mapped_column(String, nullable=True)
    generated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    generated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="reports")
    doctor: Mapped["User"] = relationship("User", back_populates="reports")

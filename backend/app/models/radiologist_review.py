import uuid
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.user import User

class RadiologistReview(Base):
    __tablename__ = "radiologist_reviews"

    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.case_id"), unique=True, nullable=False)
    radiologist_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    
    reviewed_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    annotations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_threshold_applied: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="radiologist_review")
    radiologist: Mapped["User"] = relationship("User", back_populates="radiologist_reviews")

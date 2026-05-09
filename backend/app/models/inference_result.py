import uuid
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.image import Image

class InferenceResult(Base):
    __tablename__ = "inference_results"

    inference_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("images.image_id"), nullable=False)
    
    model_version: Mapped[str] = mapped_column(String, nullable=False)
    processing_time_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    predictions: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    # Ensemble classifier output (top-1 + per-class probabilities). Nullable —
    # older inferences without a classifier on top leave this NULL.
    classification: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Anatomical lung segmentation (list of polygons).
    lung_segmentation: Mapped[list[list[float]] | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    image: Mapped["Image"] = relationship("Image", back_populates="inference_results")

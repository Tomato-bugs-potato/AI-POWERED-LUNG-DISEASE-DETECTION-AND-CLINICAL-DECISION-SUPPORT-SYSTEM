import uuid
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base, ImageFormat

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.inference_result import InferenceResult

class Image(Base):
    __tablename__ = "images"

    image_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=False)
    
    file_url: Mapped[str] = mapped_column(String, nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    file_format: Mapped[ImageFormat] = mapped_column(Enum(ImageFormat), nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    uploaded_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="images")
    inference_results: Mapped[list["InferenceResult"]] = relationship("InferenceResult", back_populates="image", cascade="all, delete-orphan")

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from app.db.base import ImageFormat
from app.schemas.inference import InferenceResponse

class ImageBase(BaseModel):
    case_id: uuid.UUID
    file_format: ImageFormat

class ImageResponse(ImageBase):
    image_id: uuid.UUID
    file_url: str
    file_size_bytes: Optional[int]
    uploaded_at: datetime
    metadata_json: Optional[dict] = None
    inference_results: List[InferenceResponse] = []

    class Config:
        from_attributes = True

class ImageUploadResponse(BaseModel):
    image_id: uuid.UUID
    case_id: uuid.UUID
    status: str = "queued_for_inference"

class ImageBase64Upload(BaseModel):
    case_id: uuid.UUID
    image_base64: str
    filename: Optional[str] = "upload.png"
    allow_duplicate: bool = True

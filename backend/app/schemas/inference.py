from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float

class Prediction(BaseModel):
    disease_class: str
    confidence_score: float
    bounding_box: BoundingBox

class InferenceResponse(BaseModel):
    inference_id: uuid.UUID
    image_id: uuid.UUID
    model_version: str
    processing_time_sec: Optional[float]
    predictions: Optional[List[Prediction]]
    created_at: datetime

    class Config:
        from_attributes = True

class InferenceStatusResponse(BaseModel):
    status: str # "queued" | "processing" | "completed" | "failed"

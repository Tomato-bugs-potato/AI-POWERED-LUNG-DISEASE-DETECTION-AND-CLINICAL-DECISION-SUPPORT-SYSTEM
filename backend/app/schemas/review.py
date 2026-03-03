from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class ReviewCreate(BaseModel):
    annotations: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    confidence_threshold_applied: Optional[int] = None
    priority: Optional[str] = None

class ReviewResponse(BaseModel):
    review_id: uuid.UUID
    case_id: uuid.UUID
    radiologist_id: uuid.UUID
    reviewed_at: datetime
    annotations: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    confidence_threshold_applied: Optional[int] = None

    class Config:
        from_attributes = True

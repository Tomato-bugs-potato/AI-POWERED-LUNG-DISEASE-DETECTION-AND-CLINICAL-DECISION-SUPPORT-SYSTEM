from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class ReportResponse(BaseModel):
    report_id: uuid.UUID
    case_id: uuid.UUID
    pdf_url: Optional[str] = None
    generated_at: datetime
    generated_by: uuid.UUID
    file_size_bytes: Optional[int] = None
    cached: bool

    class Config:
        from_attributes = True

class ReportStatusResponse(BaseModel):
    status: str # "generating" | "ready" | "failed"
    report_id: Optional[uuid.UUID] = None

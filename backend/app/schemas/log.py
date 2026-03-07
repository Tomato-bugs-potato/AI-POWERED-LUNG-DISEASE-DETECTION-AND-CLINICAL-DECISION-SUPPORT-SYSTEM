from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from app.db.base import AuditAction

class AuditLogResponse(BaseModel):
    log_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    action_type: AuditAction
    case_id: Optional[uuid.UUID] = None
    timestamp: datetime
    ip_address: Optional[str] = None
    details: Optional[dict] = None

    class Config:
        from_attributes = True

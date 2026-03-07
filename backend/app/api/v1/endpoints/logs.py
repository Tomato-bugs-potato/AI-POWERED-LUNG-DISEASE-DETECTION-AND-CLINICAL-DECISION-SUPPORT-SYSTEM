from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.schemas.log import AuditLogResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_admin
from app.db.base import AuditAction
from app.core.audit import log_action

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse], dependencies=[Depends(require_admin)])
async def get_audit_logs(
    action_type: Optional[AuditAction] = None,
    user_id: Optional[uuid.UUID] = None,
    case_id: Optional[uuid.UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(AuditLog)
    
    if action_type:
        stmt = stmt.where(AuditLog.action_type == action_type)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if case_id:
        stmt = stmt.where(AuditLog.case_id == case_id)
    if date_from:
        stmt = stmt.where(AuditLog.timestamp >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.timestamp <= date_to)
        
    stmt = stmt.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    # We don't want to log whenever admin reads logs to prevent massive spam, 
    # but the requirement dictates it according to section 4.10. 
    # To prevent spam, let's log once per endpoint call, not once per row.
    await log_action(db, AuditAction.ADMIN_LOG_VIEWED, user_id=current_user.user_id)
    
    # Because of our EncryptedText decorator, the JSON strings in 'details'
    # are automatically decrypted into plaintext JSON strings. We parse those before sending:
    import json
    for log in logs:
        if isinstance(log.details, str):
            try:
                log.details = json.loads(log.details)
            except json.JSONDecodeError:
                pass 
                
    return logs

import uuid
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.db.base import AuditAction

logger = logging.getLogger(__name__)

async def log_action(
    db: AsyncSession,
    action: AuditAction,
    user_id: uuid.UUID | str | None = None,
    case_id: uuid.UUID | str | None = None,
    ip_address: str | None = None,
    details: dict | None = None,
) -> None:
    """
    Asynchronously write an audit event to the database.
    This function should never raise an exception to the caller.
    """
    try:
        # Serialize details dictionary to JSON string before it gets picked up
        # by the EncryptedText decorator in the ORM
        class UUIDEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, uuid.UUID):
                    return str(obj)
                return super().default(obj)
                
        serialized_details = json.dumps(details, cls=UUIDEncoder) if details else None
        
        # Ensure UUIDs are strings or actual UUID objects
        uid = uuid.UUID(str(user_id)) if user_id else None
        cid = uuid.UUID(str(case_id)) if case_id else None

        audit_entry = AuditLog(
            user_id=uid,
            action_type=action,
            case_id=cid,
            ip_address=ip_address,
            details=serialized_details
        )
        
        db.add(audit_entry)
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to write audit log [{action}]: {e}", exc_info=True)
        # Rollback current transaction scope to prevent polluting the shared session
        await db.rollback()

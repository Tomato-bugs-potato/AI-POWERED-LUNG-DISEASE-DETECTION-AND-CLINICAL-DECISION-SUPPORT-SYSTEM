import uuid
from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base, AuditAction
from app.core.encryption import EncryptedText

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.case import Case

class AuditLog(Base):
    """
    Append-only audit log table.
    Should never be UPDATEd or DELETEd.
    """
    __tablename__ = "audit_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    action_type: Mapped[AuditAction] = mapped_column(Enum(AuditAction), index=True, nullable=False)
    case_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=True)
    
    timestamp: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Audit details are JSON-serialized string stored in encrypted text column
    details: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)

    # Relationships
    user: Mapped["User | None"] = relationship("User", back_populates="audit_logs")
    case: Mapped["Case | None"] = relationship("Case", back_populates="audit_logs")

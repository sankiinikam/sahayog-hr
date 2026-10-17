"""
Audit logging service — call log_action() from anywhere in the codebase.
A logging failure must NEVER reverse the underlying business transaction.
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def log_action(
    user=None,
    action: str = "",
    content_type: str = "",
    object_id: int = None,
    object_repr: str = "",
    old_values: dict = None,
    new_values: dict = None,
    ip_address: str = "",
    user_agent: str = "",
    notes: str = "",
    target_user=None,
):
    """
    Write an immutable audit log entry.

    This function swallows exceptions so that an audit failure never
    causes the primary operation to fail. The exception is logged at
    ERROR level for ops visibility.

    DO NOT include plain-text passwords, full bank account numbers,
    or raw salary figures in old_values / new_values.
    """
    if not getattr(settings, "AUDIT_LOG_ENABLED", True):
        return

    try:
        from .models import AuditLog
        AuditLog.objects.create(
            user=user,
            target_user=target_user,
            action=action,
            content_type=content_type,
            object_id=object_id,
            object_repr=object_repr,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address or None,
            user_agent=user_agent,
            notes=notes,
        )
    except Exception:
        logger.error(
            "Failed to write audit log: action=%s user=%s",
            action,
            getattr(user, "email", user),
            exc_info=True,
        )


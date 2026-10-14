import logging
from django.conf import settings
from .models import AuditLog

logger = logging.getLogger(__name__)

def log_activity(
    user=None,
    action="UPDATE",
    entity_type="GENERAL",
    entity_id=None,
    description="",
    metadata=None,
    ip_address=None
):
    """
    Central helper function to record administrative activity & audit logs.
    Only call after a business operation succeeds!
    """
    try:
        actor_role = ""
        actor_name = ""
        
        if user and getattr(user, "is_authenticated", True):
            if hasattr(user, "role") and user.role:
                actor_role = user.role.role_name
            elif getattr(user, "is_superuser", False):
                actor_role = "SYSTEM_ADMIN"
            
            first = getattr(user, "first_name", "") or ""
            last = getattr(user, "last_name", "") or ""
            full_name = f"{first} {last}".strip()
            actor_name = full_name if full_name else getattr(user, "username", "System Administrator")
        else:
            actor_name = "System Administrator"
            actor_role = "SYSTEM_ADMIN"

        return AuditLog.objects.create(
            user=user if (user and hasattr(user, "pk") and user.pk) else None,
            actor_name=actor_name,
            role=actor_role,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            description=description,
            metadata=metadata or {},
            ip_address=ip_address
        )
    except Exception as e:
        logger.error(f"Failed to record activity log: {e}", exc_info=True)
        return None

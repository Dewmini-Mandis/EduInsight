import json
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import AuditLog
from apps.accounts.models import User, Role

def get_client_ip(request):
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')

@receiver(post_save, sender=User)
def log_user_changes(sender, instance, created, **kwargs):
    action = "CREATED" if created else "UPDATED"
    name = f"{instance.first_name} {instance.last_name}".strip() or instance.username
    role_name = instance.role.role_name if hasattr(instance, "role") and instance.role else "User"
    role_str = "teacher" if role_name.upper() in ["TEACHER", "ROLE_TEACHER"] else "student" if role_name.upper() in ["STUDENT", "ROLE_STUDENT"] else "user"
    
    AuditLog.objects.create(
        user=instance,
        actor_name=name,
        role=role_name,
        action=f"{action}_USER",
        entity_type="User",
        entity_id=str(instance.id),
        description=f"{'Created new' if created else 'Updated'} {role_str} account ({name})",
        new_value=instance.username,
        reason="System Auto-log"
    )

@receiver(post_delete, sender=User)
def log_user_deletion(sender, instance, **kwargs):
    name = f"{instance.first_name} {instance.last_name}".strip() or instance.username
    role_name = instance.role.role_name if hasattr(instance, "role") and instance.role else "User"
    role_str = "teacher" if role_name.upper() in ["TEACHER", "ROLE_TEACHER"] else "student" if role_name.upper() in ["STUDENT", "ROLE_STUDENT"] else "user"
    
    AuditLog.objects.create(
        actor_name=name,
        role=role_name,
        action="DELETED_USER",
        entity_type="User",
        entity_id=str(instance.id),
        description=f"Deleted {role_str} account ({name})",
        previous_value=instance.username,
        reason="System Auto-log"
    )

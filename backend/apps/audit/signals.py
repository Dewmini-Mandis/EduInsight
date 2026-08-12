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
    # This is a basic signal. In a real app we'd pass the request 
    # via thread locals or explicitly in the view to get the actor.
    # For now we'll just log the event.
    action = "CREATED" if created else "UPDATED"
    AuditLog.objects.create(
        action=f"{action}_USER",
        entity_type="User",
        entity_id=str(instance.id),
        new_value=instance.username,
        reason="System Auto-log"
    )

@receiver(post_delete, sender=User)
def log_user_deletion(sender, instance, **kwargs):
    AuditLog.objects.create(
        action="DELETED_USER",
        entity_type="User",
        entity_id=str(instance.id),
        previous_value=instance.username,
        reason="System Auto-log"
    )

from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    role = models.CharField(max_length=50, blank=True)
    action = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=255)
    entity_id = models.CharField(max_length=255, null=True, blank=True)
    previous_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    reason = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    classroom_context = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.action} on {self.entity_type} at {self.timestamp}"


class SensitiveAccessLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="sensitive_access_logs")
    role = models.CharField(max_length=50, blank=True)
    action = models.CharField(max_length=255)
    target_student_id = models.CharField(max_length=255, null=True, blank=True)
    data_type_accessed = models.CharField(max_length=255)
    reason = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"Accessed {self.data_type_accessed} by {self.user} at {self.timestamp}"

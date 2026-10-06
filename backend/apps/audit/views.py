from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.accounts.models import Role

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Administrators can view activity logs.")
        
        queryset = AuditLog.objects.all().order_by("-timestamp")
        
        limit = self.request.query_params.get("limit")
        entity_type = self.request.query_params.get("entity_type")
        action = self.request.query_params.get("action")

        if entity_type:
            queryset = queryset.filter(entity_type__iexact=entity_type)
        if action:
            queryset = queryset.filter(action__iexact=action)

        if limit and limit.isdigit():
            queryset = queryset[:int(limit)]

        return queryset

from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from apps.accounts.models import Role
from .models import Recommendation
from .serializers import RecommendationSerializer

class RecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = RecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return Recommendation.objects.all().select_related("student__user").order_by("-created_at")
        if user.is_role(Role.ROLE_TEACHER):
            return Recommendation.objects.filter(student__user__school=user.school).select_related("student__user").order_by("-created_at")
        if user.is_role(Role.ROLE_STUDENT):
            return Recommendation.objects.filter(student__user=user).select_related("student__user").order_by("-created_at")
        return Recommendation.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to create recommendations.")
        serializer.save()

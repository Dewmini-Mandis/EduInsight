from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.accounts.models import Role, Notification
from apps.classes.models import Student
from .models import Analytics, RiskPrediction, ProficiencyPrediction
from .serializers import AnalyticsSerializer, RiskPredictionSerializer, ProficiencyPredictionSerializer

class AnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AnalyticsSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return Analytics.objects.all()
        if user.is_role(Role.ROLE_TEACHER):
            school_id = user.school_id
            if school_id:
                return Analytics.objects.filter(student__user__school_id=school_id)
            return Analytics.objects.all()
        if user.is_role(Role.ROLE_STUDENT):
            student, _ = Student.objects.get_or_create(user=user)
            return Analytics.objects.filter(student=student)
        return Analytics.objects.none()

class RiskPredictionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RiskPredictionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return RiskPrediction.objects.all().order_by("-prediction_date")
        if user.is_role(Role.ROLE_TEACHER):
            school_id = user.school_id
            if school_id:
                return RiskPrediction.objects.filter(student__user__school_id=school_id).order_by("-prediction_date")
            return RiskPrediction.objects.all().order_by("-prediction_date")
        if user.is_role(Role.ROLE_STUDENT):
            student, _ = Student.objects.get_or_create(user=user)
            return RiskPrediction.objects.filter(student=student).order_by("-prediction_date")
        return RiskPrediction.objects.none()

    def perform_create(self, serializer):
        prediction = serializer.save()
        if prediction.risk_category in [RiskPrediction.RISK_HIGH, RiskPrediction.RISK_CRITICAL]:
            Notification.objects.create(
                user=prediction.student.user,
                title="Risk Alert",
                message=f"You have been identified as {prediction.risk_category} risk.",
                link=f"/student/risk/{prediction.id}"
            )
    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        user = request.user
        if not user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            return Response({"detail": "Permission denied"}, status=403)
        prediction = self.get_object()
        prediction.is_flagged = True
        prediction.flag_reason = request.data.get('reason', '')
        prediction.save()
        return Response({"status": "Flagged successfully"})


class ProficiencyPredictionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProficiencyPredictionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return ProficiencyPrediction.objects.all().order_by("-prediction_date")
        if user.is_role(Role.ROLE_TEACHER):
            school_id = user.school_id
            if school_id:
                return ProficiencyPrediction.objects.filter(student__user__school_id=school_id).order_by("-prediction_date")
            return ProficiencyPrediction.objects.all().order_by("-prediction_date")
        if user.is_role(Role.ROLE_STUDENT):
            student, _ = Student.objects.get_or_create(user=user)
            return ProficiencyPrediction.objects.filter(student=student).order_by("-prediction_date")
        return ProficiencyPrediction.objects.none()
        
    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        user = request.user
        if not user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            return Response({"detail": "Permission denied"}, status=403)
        prediction = self.get_object()
        prediction.is_flagged = True
        prediction.flag_reason = request.data.get('reason', '')
        prediction.save()
        return Response({"status": "Flagged successfully"})

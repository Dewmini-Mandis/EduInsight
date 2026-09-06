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

from rest_framework.views import APIView
from apps.quizzes.models import Skill
from django.shortcuts import get_object_or_404
from .services.student_feature_builder import build_student_skill_features
from .services.risk_predictor import predict_student_risk

class StudentSkillRiskPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id, skill_id):
        # 1. Validate student and skill exist
        student = get_object_or_404(Student, id=student_id)
        skill = get_object_or_404(Skill, id=skill_id)
        
        # 2. Build features
        feature_result = build_student_skill_features(student_id, skill_id)
        if feature_result["status"] == "insufficient_history":
            return Response({
                "status": "insufficient_history",
                "required_interactions": feature_result["required_interactions"],
                "available_interactions": feature_result["available_interactions"]
            }, status=200)
            
        features = feature_result["features"]
        
        # 3. Predict risk
        pred_result = predict_student_risk(features)
        if pred_result["status"] == "error":
            return Response({"error": pred_result["message"]}, status=500)
            
        # 4. Save Prediction History
        prediction = RiskPrediction.objects.create(
            student=student,
            skill=skill,
            risk_category=pred_result["risk_level"],
            risk_probability=pred_result["risk_probability"],
            threshold=pred_result["threshold"],
            model_version=pred_result["model_version"],
            contributing_factors=features
        )
        
        return Response({
            "student_id": student.id,
            "skill_id": skill.id,
            "risk_probability": pred_result["risk_probability"],
            "risk_percentage": pred_result["risk_percentage"],
            "risk_level": pred_result["risk_level"],
            "threshold": pred_result["threshold"],
            "model_version": pred_result["model_version"]
        })

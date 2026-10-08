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
        qs = Analytics.objects.select_related("student__user").order_by("-id")
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return qs
        if user.is_role(Role.ROLE_TEACHER):
            return qs.filter(student__registered_by=user)
        if user.is_role(Role.ROLE_STUDENT):
            student = getattr(user, "student_profile", None)
            if not student:
                student, _ = Student.objects.get_or_create(user=user)
            return qs.filter(student=student)
        return Analytics.objects.none()

    @action(detail=False, methods=["get"], url_path="dashboard_summary")
    def dashboard_summary(self, request):
        user = request.user
        if not user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            return Response({"detail": "Permission denied"}, status=403)

        from apps.classes.models import Student, SchoolClass
        from apps.quizzes.models import Quiz, LearningMaterial, Lesson
        from apps.attempts.models import QuizAttempt
        from django.db.models import Count

        if user.is_role(Role.ROLE_TEACHER):
            total_students = Student.objects.filter(registered_by=user).count()
            published_quizzes = Quiz.objects.filter(created_by=user, status="PUBLISHED", is_deleted=False).count()
            total_materials = LearningMaterial.objects.filter(created_by=user).count()
            active_lessons = Lesson.objects.filter(created_by=user, is_active=True).count()

            classes_qs = SchoolClass.objects.filter(teacherclassroom__teacher=user)
            class_performance = [
                {"className": c.name, "avgScore": getattr(c, "average_score", 0)} for c in classes_qs
            ]

            # Scope teacher to their assigned classes / registered students
            from django.db.models import Q
            from apps.attempts.models import StudentRemediationState, TeacherIntervention

            # Active escalated teacher interventions (is_pending=True)
            intervention_qs = (
                TeacherIntervention.objects.filter(
                    is_pending=True,
                    remediation_state__status=StudentRemediationState.STATUS_ESCALATED_TEACHER,
                    student__user__is_active=True
                )
                .filter(
                    Q(teacher=user) |
                    Q(student__registered_by=user) |
                    Q(student__class_room__teacherclassroom__teacher=user, student__class_room__teacherclassroom__is_active=True)
                )
                .select_related("student__user", "student__class_room", "quiz__lesson", "skill", "remediation_state__reassessment_attempt")
                .distinct()
                .order_by("-date_recorded")[:10]
            )

            risk_students = []
            for item in intervention_qs:
                reassess_att = item.remediation_state.reassessment_attempt if item.remediation_state else None
                failed_score = reassess_att.score if reassess_att else None
                pass_mark = item.quiz.pass_mark if item.quiz else 70
                weak_skill_name = item.skill.name if item.skill else None
                
                risk_students.append({
                    "id": str(item.id),
                    "student_id": item.student.id,
                    "quiz_id": item.quiz.id if item.quiz else None,
                    "name": item.student.user.get_full_name() or item.student.user.username,
                    "className": item.student.class_room.name if item.student.class_room else (item.student.class_name or "Class"),
                    "quizTitle": item.quiz.title if item.quiz else "Reassessment",
                    "lessonTitle": item.quiz.lesson.title if item.quiz and item.quiz.lesson else "-",
                    "score": failed_score,
                    "passMark": pass_mark,
                    "weakSkill": weak_skill_name,
                    "status": "Needs Teacher Intervention",
                    "riskLevel": "Needs Intervention",
                    "date": item.date_recorded.strftime("%Y-%m-%d") if item.date_recorded else ""
                })

            recent_quizzes_qs = list(Quiz.objects.filter(created_by=user, is_deleted=False).select_related("lesson", "assigned_class").order_by("-created_at")[:5])
            recent_quiz_ids = [q.id for q in recent_quizzes_qs]
            attempt_counts = dict(
                QuizAttempt.objects.filter(quiz_id__in=recent_quiz_ids)
                .values('quiz_id')
                .annotate(cnt=Count('id'))
                .values_list('quiz_id', 'cnt')
            ) if recent_quiz_ids else {}

            recent_quizzes = [
                {
                    "id": str(q.id),
                    "title": q.title,
                    "lesson": q.lesson.title if q.lesson else "",
                    "assignedClass": q.assigned_class.name if q.assigned_class else "Assigned Class",
                    "attempts": attempt_counts.get(q.id, 0),
                    "status": "Active" if q.status == "PUBLISHED" else "Draft"
                }
                for q in recent_quizzes_qs
            ]

            recent_mats_qs = LearningMaterial.objects.filter(created_by=user).order_by("-created_at")[:5]
            recent_materials = [
                {
                    "id": str(m.id),
                    "title": m.title,
                    "type": "Video" if m.material_type == "VIDEO" else "Note" if m.material_type == "TEXT" else "Attachment",
                    "uploadDate": m.created_at.strftime("%Y-%m-%d") if m.created_at else "Recent"
                }
                for m in recent_mats_qs
            ]
        else:
            total_students = Student.objects.count()
            published_quizzes = Quiz.objects.filter(status="PUBLISHED", is_deleted=False).count()
            total_materials = LearningMaterial.objects.count()
            active_lessons = Lesson.objects.filter(is_active=True).count()
            class_performance = []
            risk_students = []
            recent_quizzes = []
            recent_materials = []

        return Response({
            "summary": {
                "totalStudents": total_students,
                "activeQuizzes": published_quizzes,
                "learningMaterials": total_materials,
                "lessonsManaged": active_lessons
            },
            "classPerformance": class_performance,
            "riskStudents": risk_students,
            "recentQuizzes": recent_quizzes,
            "recentMaterials": recent_materials
        })

class RiskPredictionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RiskPredictionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = RiskPrediction.objects.select_related("student__user", "student__class_room", "skill").order_by("-prediction_date")
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return qs
        if user.is_role(Role.ROLE_TEACHER):
            return qs.filter(student__registered_by=user)
        if user.is_role(Role.ROLE_STUDENT):
            student = getattr(user, "student_profile", None)
            if not student:
                student, _ = Student.objects.get_or_create(user=user)
            return qs.filter(student=student)
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
        qs = ProficiencyPrediction.objects.select_related("student__user").order_by("-prediction_date")
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return qs
        if user.is_role(Role.ROLE_TEACHER):
            student_ids = list(Student.objects.filter(registered_by=user).values_list("id", flat=True))
            return qs.filter(student_id__in=student_ids)
        if user.is_role(Role.ROLE_STUDENT):
            student = getattr(user, "student_profile", None)
            if not student:
                student, _ = Student.objects.get_or_create(user=user)
            return qs.filter(student_id=student.id)
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
from rest_framework.exceptions import PermissionDenied
from apps.quizzes.models import Skill
from django.shortcuts import get_object_or_404
from .services.student_feature_builder import build_student_skill_features
from .services.risk_predictor import predict_student_risk

class StudentSkillRiskPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id, skill_id):
        # 1. Validate student and skill exist
        student = get_object_or_404(Student, id=student_id)
        if request.user.is_role(Role.ROLE_TEACHER) and student.registered_by_id != request.user.id:
            raise PermissionDenied("You do not have permission to view analytics for this student.")
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

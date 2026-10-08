from rest_framework import serializers
from apps.attempts.models import QuizAttempt, AttemptQuestion, AttemptAnswer, ManualMark, TeacherOverride
from apps.quizzes.serializers import QuestionSerializer

class AttemptQuestionSerializer(serializers.ModelSerializer):
    question_detail = QuestionSerializer(source="question", read_only=True)

    class Meta:
        model = AttemptQuestion
        fields = ["id", "question", "order", "question_detail"]

class AttemptAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttemptAnswer
        fields = [
            "id",
            "question",
            "selected_answer",
            "typed_answer",
            "is_correct",
            "hint_count",
        ]

class QuizAttemptListSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    student_id = serializers.IntegerField(read_only=True)
    student_user_id = serializers.IntegerField(source="student.user_id", read_only=True)
    student_username = serializers.CharField(source="student.user.username", read_only=True)
    student_name = serializers.SerializerMethodField()
    quiz_lesson_id = serializers.IntegerField(source="quiz.lesson_id", read_only=True)
    quiz_lesson_title = serializers.CharField(source="quiz.lesson.title", read_only=True)
    quiz_skill_id = serializers.IntegerField(source="quiz.skill_id", read_only=True)
    quiz_skill_name = serializers.CharField(source="quiz.skill.name", read_only=True)
    quiz_term_id = serializers.IntegerField(source="quiz.lesson.term_id", read_only=True)
    quiz_term_name = serializers.CharField(source="quiz.lesson.term.name", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "quiz_title",
            "quiz_lesson_id",
            "quiz_lesson_title",
            "quiz_skill_id",
            "quiz_skill_name",
            "quiz_term_id",
            "quiz_term_name",
            "student",
            "student_id",
            "student_user_id",
            "student_username",
            "student_name",
            "attempt_number",
            "attempt_type",
            "start_time",
            "end_time",
            "expires_at",
            "status",
            "auto_submitted",
            "score",
        ]
        read_only_fields = ["student", "attempt_number", "start_time", "expires_at", "status", "auto_submitted", "score"]

    def get_student_name(self, obj):
        name = obj.student.user.get_full_name()
        return name if name else obj.student.user.username

class QuizAttemptSerializer(serializers.ModelSerializer):
    answers = AttemptAnswerSerializer(many=True, read_only=True)
    attempt_questions = AttemptQuestionSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    student_id = serializers.IntegerField(read_only=True)
    student_user_id = serializers.IntegerField(source="student.user_id", read_only=True)
    student_username = serializers.CharField(source="student.user.username", read_only=True)
    student_name = serializers.SerializerMethodField()
    quiz_lesson_id = serializers.IntegerField(source="quiz.lesson_id", read_only=True)
    quiz_lesson_title = serializers.CharField(source="quiz.lesson.title", read_only=True)
    quiz_skill_id = serializers.IntegerField(source="quiz.skill_id", read_only=True)
    quiz_skill_name = serializers.CharField(source="quiz.skill.name", read_only=True)
    quiz_term_id = serializers.IntegerField(source="quiz.lesson.term_id", read_only=True)
    quiz_term_name = serializers.CharField(source="quiz.lesson.term.name", read_only=True)
    skill_results = serializers.SerializerMethodField()
    risk_prediction = serializers.SerializerMethodField()
    risk_support = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "quiz_title",
            "quiz_lesson_id",
            "quiz_lesson_title",
            "quiz_skill_id",
            "quiz_skill_name",
            "quiz_term_id",
            "quiz_term_name",
            "student",
            "student_id",
            "student_user_id",
            "student_username",
            "student_name",
            "attempt_number",
            "attempt_type",
            "start_time",
            "end_time",
            "expires_at",
            "status",
            "auto_submitted",
            "score",
            "answers",
            "attempt_questions",
            "skill_results",
            "risk_prediction",
            "risk_support",
        ]
        read_only_fields = ["student", "attempt_number", "start_time", "expires_at", "status", "auto_submitted", "score"]
        validators = []

    def get_student_name(self, obj):
        name = obj.student.user.get_full_name()
        return name if name else obj.student.user.username

    def _get_latest_risk_pred(self, obj):
        if hasattr(obj, "_cached_latest_pred"):
            return getattr(obj, "_cached_latest_pred")

        preds = list(obj.risk_predictions.all())
        latest_pred = preds[0] if preds else None
        if not latest_pred:
            from apps.analytics.models import RiskPrediction
            latest_pred = RiskPrediction.objects.filter(student=obj.student).order_by("-prediction_date", "-id").first()

        setattr(obj, "_cached_latest_pred", latest_pred)
        return latest_pred

    def get_risk_prediction(self, obj):
        latest_pred = self._get_latest_risk_pred(obj)
        if not latest_pred:
            return None

        from apps.accounts.models import Role
        from apps.analytics.services.student_support_mapper import (
            build_student_support_presentation,
            build_teacher_educational_presentation,
            build_admin_technical_presentation,
        )

        request = self.context.get("request")
        user = request.user if (request and hasattr(request, "user") and request.user.is_authenticated) else None

        if user:
            if user.is_role(Role.ROLE_STUDENT):
                # SECURITY REQUIREMENT: Students MUST NOT receive raw risk levels, probabilities, thresholds, or SHAP metrics
                return None
            elif user.is_role(Role.ROLE_TEACHER):
                return build_teacher_educational_presentation(latest_pred)
            elif user.is_role(Role.ROLE_SYSTEM_ADMIN):
                return build_admin_technical_presentation(latest_pred)

        # Fallback for internal scripts or un-contextualized serializers
        return build_admin_technical_presentation(latest_pred)

    def get_risk_support(self, obj):
        latest_pred = self._get_latest_risk_pred(obj)
        from apps.analytics.services.student_support_mapper import build_student_support_presentation
        return build_student_support_presentation(latest_pred)

    def get_skill_results(self, obj):
        results = {}
        attempt_qs = list(obj.attempt_questions.all())
        answers_map = {ans.question_id: ans for ans in obj.answers.all()}

        if attempt_qs:
            for aq in attempt_qs:
                q = aq.question
                skill = q.skill or obj.quiz.skill
                skill_id = skill.id if skill else 0
                skill_name = skill.name if skill else "General Knowledge"

                if skill_id not in results:
                    results[skill_id] = {
                        "skill_id": skill_id,
                        "skill_name": skill_name,
                        "total_questions": 0,
                        "correct_count": 0,
                        "incorrect_count": 0,
                        "accuracy_percentage": 0.0,
                    }

                results[skill_id]["total_questions"] += 1
                ans = answers_map.get(q.id)
                if ans and ans.is_correct:
                    results[skill_id]["correct_count"] += 1
                else:
                    results[skill_id]["incorrect_count"] += 1
        else:
            for ans in obj.answers.all():
                skill = ans.skill or getattr(ans.question, "skill", None)
                skill_id = skill.id if skill else 0
                skill_name = skill.name if skill else "General Knowledge"

                if skill_id not in results:
                    results[skill_id] = {
                        "skill_id": skill_id,
                        "skill_name": skill_name,
                        "total_questions": 0,
                        "correct_count": 0,
                        "incorrect_count": 0,
                        "accuracy_percentage": 0.0,
                    }

                results[skill_id]["total_questions"] += 1
                if ans.is_correct:
                    results[skill_id]["correct_count"] += 1
                else:
                    results[skill_id]["incorrect_count"] += 1

        for s_id, s_data in results.items():
            if s_data["total_questions"] > 0:
                s_data["accuracy_percentage"] = round((s_data["correct_count"] / s_data["total_questions"]) * 100, 1)

        return list(results.values())


class ManualMarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManualMark
        fields = "__all__"
        read_only_fields = ["marked_at"]

class TeacherOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherOverride
        fields = "__all__"
        read_only_fields = ["created_at"]

from .models import StudentLessonProgress, StudentContentProgress, StudentEngagementAnswer, StudentVideoAnswer, StudentRemediationState, TeacherIntervention

class StudentLessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentLessonProgress
        fields = "__all__"
        read_only_fields = ["student"]

class StudentContentProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentContentProgress
        fields = "__all__"
        read_only_fields = ["student"]

class StudentEngagementAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentEngagementAnswer
        fields = "__all__"
        read_only_fields = ["student", "answered_at"]

class StudentVideoAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentVideoAnswer
        fields = "__all__"
        read_only_fields = ["student", "answered_at"]

class StudentRemediationStateSerializer(serializers.ModelSerializer):
    weak_skills_detail = serializers.SerializerMethodField()
    required_materials_detail = serializers.SerializerMethodField()

    class Meta:
        model = StudentRemediationState
        fields = "__all__"

    def get_weak_skills_detail(self, obj):
        return [{"id": s.id, "name": s.name} for s in obj.weak_skills.all()]

    def get_required_materials_detail(self, obj):
        student = obj.student
        completed_mat_ids = set(
            StudentContentProgress.objects.filter(student=student, material__in=obj.required_materials.all(), is_completed=True)
            .values_list("material_id", flat=True)
        )
        return [
            {
                "id": m.id,
                "title": m.title,
                "material_type": m.material_type,
                "is_completed": m.id in completed_mat_ids,
            }
            for m in obj.required_materials.all()
        ]

class TeacherInterventionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True, default=None)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True, default=None)

    class Meta:
        model = TeacherIntervention
        fields = "__all__"
        read_only_fields = ["date_recorded"]


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

class QuizAttemptSerializer(serializers.ModelSerializer):
    answers = AttemptAnswerSerializer(many=True, read_only=True)
    attempt_questions = AttemptQuestionSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "quiz_title",
            "student",
            "student_name",
            "attempt_number",
            "start_time",
            "end_time",
            "expires_at",
            "status",
            "auto_submitted",
            "score",
            "answers",
            "attempt_questions",
        ]
        read_only_fields = ["student", "attempt_number", "start_time", "expires_at", "status", "auto_submitted", "score"]


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

from .models import StudentLessonProgress, StudentContentProgress, StudentEngagementAnswer

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

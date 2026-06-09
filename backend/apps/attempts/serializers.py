from rest_framework import serializers
from apps.attempts.models import QuizAttempt, AttemptAnswer

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
            "score",
            "answers",
        ]
        read_only_fields = ["student", "attempt_number", "start_time", "score"]

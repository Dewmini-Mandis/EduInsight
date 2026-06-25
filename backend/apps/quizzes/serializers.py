from rest_framework import serializers
from .models import Quiz, Question, Answer, CorrectAnswer, Hint, Lesson

class LessonSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Lesson
        fields = [
            "id",
            "title",
            "description",
            "term",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["created_by"]


class AnswerSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Answer
        fields = ["id", "answer_text", "is_correct"]

class CorrectAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectAnswer
        fields = ["correct_value"]

class HintSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Hint
        fields = ["id", "hint_text", "sequence_no"]

class QuestionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    answers = AnswerSerializer(many=True, required=False)
    hints = HintSerializer(many=True, required=False)
    correct_value = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    correct_answer = CorrectAnswerSerializer(read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "question_text",
            "question_type",
            "difficulty_level",
            "answers",
            "hints",
            "correct_value",
            "correct_answer",
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.question_type == Question.TYPE_NUMERIC:
            correct_ans = getattr(instance, "correct_answer", None)
            ret["correct_value"] = correct_ans.correct_value if correct_ans else ""
        return ret

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    school_name = serializers.CharField(source="school.name", read_only=True)
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "description",
            "lesson",
            "lesson_title",
            "learning_level",
            "school",
            "school_name",
            "created_by",
            "created_by_name",
            "questions",
            "created_at",
            "max_attempts",
        ]
        read_only_fields = ["created_by"]

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        request = self.context.get("request")
        if request and request.user:
            validated_data["created_by"] = request.user

        quiz = Quiz.objects.create(**validated_data)

        for q_data in questions_data:
            answers_data = q_data.pop("answers", [])
            hints_data = q_data.pop("hints", [])
            correct_value = q_data.pop("correct_value", None)

            question = Question.objects.create(quiz=quiz, **q_data)

            if q_data.get("question_type") == Question.TYPE_MCQ:
                for a_data in answers_data:
                    Answer.objects.create(question=question, **a_data)
            elif q_data.get("question_type") == Question.TYPE_NUMERIC:
                if correct_value is not None:
                    CorrectAnswer.objects.create(question=question, correct_value=correct_value)

            for h_data in hints_data:
                Hint.objects.create(question=question, **h_data)

        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop("questions", None)
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.school = validated_data.get("school", instance.school)
        instance.max_attempts = validated_data.get("max_attempts", instance.max_attempts)
        instance.lesson = validated_data.get("lesson", instance.lesson)
        instance.learning_level = validated_data.get("learning_level", instance.learning_level)
        instance.save()


        if questions_data is not None:
            instance.questions.all().delete()
            for q_data in questions_data:
                answers_data = q_data.pop("answers", [])
                hints_data = q_data.pop("hints", [])
                correct_value = q_data.pop("correct_value", None)

                question = Question.objects.create(quiz=instance, **q_data)

                if q_data.get("question_type") == Question.TYPE_MCQ:
                    for a_data in answers_data:
                        Answer.objects.create(question=question, **a_data)
                elif q_data.get("question_type") == Question.TYPE_NUMERIC:
                    if correct_value is not None:
                        CorrectAnswer.objects.create(question=question, correct_value=correct_value)

                for h_data in hints_data:
                    Hint.objects.create(question=question, **h_data)

        return instance

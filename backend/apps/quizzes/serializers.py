from rest_framework import serializers
from .models import EngagementQuestion, Quiz, Question, Answer, CorrectAnswer, Hint, Lesson, AcademicTerm, Topic, Skill, QuizLevel, DifficultyLevel, LearningMaterial, VideoQuestion, MaterialAttachment

class AcademicTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicTerm
        fields = "__all__"

class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = "__all__"

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = "__all__"

class QuizLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizLevel
        fields = "__all__"

class DifficultyLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = DifficultyLevel
        fields = "__all__"


class EngagementQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EngagementQuestion
        fields = "__all__"

class VideoQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoQuestion
        fields = "__all__"

class MaterialAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialAttachment
        fields = "__all__"

class LearningMaterialSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)
    assigned_class_name = serializers.CharField(source="assigned_class.name", read_only=True, allow_null=True)
    quiz_level_name = serializers.CharField(source="quiz_level.name", read_only=True, allow_null=True)
    difficulty_name = serializers.CharField(source="difficulty.name", read_only=True, allow_null=True)

    engagement_questions = EngagementQuestionSerializer(many=True, read_only=True)
    video_questions = VideoQuestionSerializer(many=True, read_only=True)
    attachments = MaterialAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = LearningMaterial
        fields = "__all__"
        read_only_fields = ["created_by"]

class LessonSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    term_name = serializers.CharField(source="term.name", read_only=True)

    class Meta:
        model = Lesson
        fields = [
            "id",
            "title",
            "description",
            "term",
            "term_name",
            "created_by",
            "created_by_name",
            "created_at",
            "is_active",
            "quiz",
            "order",
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
    assigned_class_name = serializers.CharField(source="assigned_class.name", read_only=True, allow_null=True)
    quiz_level_name = serializers.CharField(source="quiz_level.name", read_only=True, allow_null=True)
    difficulty_name = serializers.CharField(source="difficulty.name", read_only=True, allow_null=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "description",
            "lesson",
            "lesson_title",
            "assigned_class",
            "assigned_class_name",
            "quiz_level_name",
            "difficulty_name",
            "topic",
            "skill",
            "quiz_level",
            "difficulty",
            "order",
            "pass_mark",
            "estimated_time_minutes",
            "school",
            "school_name",
            "created_by",
            "created_by_name",
            "questions",
            "created_at",
            "max_attempts",
        ]
        read_only_fields = ["created_by"]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        import random
        # If there's a blueprint, pick random questions from the bank
        if hasattr(instance, 'blueprint') and instance.blueprint and instance.blueprint.question_bank:
            bp = instance.blueprint
            bank_qs = instance.blueprint.question_bank.questions.all()
            questions_list = list(bank_qs)
            random.shuffle(questions_list)
            selected = questions_list[:bp.total_questions]
            ret['questions'] = QuestionSerializer(selected, many=True, context=self.context).data
        return ret


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
        instance.topic = validated_data.get("topic", instance.topic)
        instance.skill = validated_data.get("skill", instance.skill)
        instance.quiz_level = validated_data.get("quiz_level", instance.quiz_level)
        instance.difficulty = validated_data.get("difficulty", instance.difficulty)
        instance.assigned_class = validated_data.get("assigned_class", instance.assigned_class)
        instance.order = validated_data.get("order", instance.order)
        instance.pass_mark = validated_data.get("pass_mark", instance.pass_mark)
        instance.estimated_time_minutes = validated_data.get("estimated_time_minutes", instance.estimated_time_minutes)
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

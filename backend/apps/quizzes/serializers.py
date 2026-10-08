from rest_framework import serializers
from apps.classes.models import SchoolClass
from apps.classes.serializers import SchoolClassSerializer
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
    skill_name = serializers.CharField(source="skill.name", read_only=True, allow_null=True)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True, allow_null=True)
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
    description = serializers.CharField(required=False, allow_blank=True, default="")
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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")

        is_review = self.context.get("is_review", False)
        if not is_review and request and hasattr(request, "parser_context"):
            view = request.parser_context.get("view")
            view_name = view.__class__.__name__ if view else ""
            if view_name in ["QuizAttemptViewSet", "AttemptDetailView"]:
                is_review = True

        if not is_review and request and hasattr(request, "user") and request.user.is_authenticated:
            if getattr(request.user, "role_name", None) == "STUDENT" or (hasattr(request.user, "is_role") and request.user.is_role("STUDENT")):
                ret.pop("is_correct", None)
        return ret

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
            "skill",
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
        request = self.context.get("request")
        is_student = request and hasattr(request, "user") and hasattr(request.user, "is_role") and request.user.is_role("STUDENT")
        if is_student:
            ret.pop("correct_answer", None)
            ret.pop("correct_value", None)
        elif instance.question_type == Question.TYPE_NUMERIC:
            correct_ans = getattr(instance, "correct_answer", None)
            ret["correct_value"] = correct_ans.correct_value if correct_ans else ""
        return ret

class StudentQuizListSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source="lesson.title", read_only=True, allow_null=True)
    quiz_level_name = serializers.CharField(source="quiz_level.name", read_only=True, allow_null=True)
    difficulty_name = serializers.CharField(source="difficulty.name", read_only=True, allow_null=True)
    question_count = serializers.IntegerField(source="annotated_question_count", read_only=True, default=0)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "description",
            "status",
            "lesson",
            "lesson_title",
            "quiz_level",
            "quiz_level_name",
            "difficulty",
            "difficulty_name",
            "order",
            "pass_mark",
            "estimated_time_minutes",
            "question_count",
        ]

class QuizListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    school_name = serializers.CharField(source="school.name", read_only=True, allow_null=True)
    lesson_title = serializers.CharField(source="lesson.title", read_only=True, allow_null=True)
    assigned_class_name = serializers.CharField(source="assigned_class.name", read_only=True, allow_null=True)
    assigned_classes_details = SchoolClassSerializer(source="assigned_classes", many=True, read_only=True)
    quiz_level_name = serializers.CharField(source="quiz_level.name", read_only=True, allow_null=True)
    difficulty_name = serializers.CharField(source="difficulty.name", read_only=True, allow_null=True)
    covered_skills_details = SkillSerializer(source="skills", many=True, read_only=True)
    skill_ids = serializers.SerializerMethodField()
    question_count = serializers.IntegerField(source="annotated_question_count", read_only=True, default=0)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "description",
            "status",
            "lesson",
            "lesson_title",
            "assigned_class",
            "assigned_class_name",
            "assigned_classes",
            "assigned_classes_details",
            "quiz_level_name",
            "difficulty_name",
            "topic",
            "skill",
            "skills",
            "skill_ids",
            "covered_skills_details",
            "quiz_level",
            "difficulty",
            "order",
            "pass_mark",
            "estimated_time_minutes",
            "school",
            "school_name",
            "created_by",
            "created_by_name",
            "created_at",
            "max_attempts",
            "question_count",
        ]
        read_only_fields = ["created_by"]

    def get_skill_ids(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "skills" in obj._prefetched_objects_cache:
            return [s.id for s in obj.skills.all()]
        return [s.id for s in obj.get_covered_skills()]

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    school_name = serializers.CharField(source="school.name", read_only=True)
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)
    assigned_class_name = serializers.CharField(source="assigned_class.name", read_only=True, allow_null=True)
    assigned_classes = serializers.PrimaryKeyRelatedField(
        many=True, queryset=SchoolClass.objects.all(), required=False
    )
    assigned_classes_details = SchoolClassSerializer(source="assigned_classes", many=True, read_only=True)
    quiz_level_name = serializers.CharField(source="quiz_level.name", read_only=True, allow_null=True)
    difficulty_name = serializers.CharField(source="difficulty.name", read_only=True, allow_null=True)
    skills = serializers.PrimaryKeyRelatedField(many=True, queryset=Skill.objects.all(), required=False)
    covered_skills_details = SkillSerializer(source="get_covered_skills", many=True, read_only=True)
    skill_ids = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "description",
            "status",
            "lesson",
            "lesson_title",
            "assigned_class",
            "assigned_class_name",
            "assigned_classes",
            "assigned_classes_details",
            "quiz_level_name",
            "difficulty_name",
            "topic",
            "skill",
            "skills",
            "skill_ids",
            "covered_skills_details",
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

    def get_skill_ids(self, obj):
        return [s.id for s in obj.get_covered_skills()]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        if request and hasattr(request, "user") and hasattr(request.user, "is_role") and request.user.is_role("STUDENT"):
            # Never expose the full question bank to student quiz details API
            ret["questions"] = []
            return ret

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


    def validate(self, attrs):
        status_val = attrs.get("status", getattr(self.instance, "status", Quiz.STATUS_DRAFT))
        lesson_val = attrs.get("lesson", getattr(self.instance, "lesson", None))
        if not lesson_val:
            raise serializers.ValidationError({
                "lesson": ["Lesson is required to save a draft."]
            })

        questions_data = attrs.get("questions", None)
        
        if status_val == Quiz.STATUS_PUBLISHED:
            q_count = len(questions_data) if questions_data is not None else (self.instance.questions.count() if self.instance else 0)
            if q_count < 10:
                raise serializers.ValidationError({
                    "status": f"Publication blocked: A published quiz must contain at least 10 valid questions matching the selected Skill (Current: {q_count}/10)."
                })

        order_val = attrs.get("order", getattr(self.instance, "order", 1))
        if order_val is not None:
            try:
                order_num = int(order_val)
                if order_num < 1:
                    raise ValueError()
            except (ValueError, TypeError):
                raise serializers.ValidationError({
                    "order": ["Order number must be a positive whole number."]
                })

        lesson_obj = attrs.get("lesson", getattr(self.instance, "lesson", None))
        quiz_level_obj = attrs.get("quiz_level", getattr(self.instance, "quiz_level", None))
        difficulty_obj = attrs.get("difficulty", getattr(self.instance, "difficulty", None))

        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None

        if lesson_obj and quiz_level_obj and difficulty_obj and order_val:
            dup_qs = Quiz.objects.filter(
                is_deleted=False,
                lesson=lesson_obj,
                quiz_level=quiz_level_obj,
                difficulty=difficulty_obj,
                order=order_val
            )
            if user and hasattr(user, "is_authenticated") and user.is_authenticated:
                dup_qs = dup_qs.filter(created_by=user)

            if self.instance:
                dup_qs = dup_qs.exclude(id=self.instance.id)

            if dup_qs.exists():
                raise serializers.ValidationError({
                    "order": ["A quiz already exists at this order for the selected lesson, level, and difficulty. Please choose a different order number."]
                })

        return attrs

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        assigned_classes_data = validated_data.pop("assigned_classes", None)
        request = self.context.get("request")
        if request and request.user:
            validated_data["created_by"] = request.user

        if assigned_classes_data and not validated_data.get("assigned_class"):
            validated_data["assigned_class"] = assigned_classes_data[0]

        quiz = Quiz.objects.create(**validated_data)
        if assigned_classes_data is not None:
            quiz.assigned_classes.set(assigned_classes_data)

        for q_data in questions_data:
            answers_data = q_data.pop("answers", [])
            hints_data = q_data.pop("hints", [])
            correct_value = q_data.pop("correct_value", None)
            q_skill = q_data.pop("skill", None) or quiz.skill

            question = Question.objects.create(quiz=quiz, skill=q_skill, **q_data)

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
        assigned_classes_data = validated_data.pop("assigned_classes", None)
        if assigned_classes_data is not None:
            instance.assigned_classes.set(assigned_classes_data)
            if assigned_classes_data and "assigned_class" not in validated_data:
                instance.assigned_class = assigned_classes_data[0]

        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.status = validated_data.get("status", instance.status)
        instance.school = validated_data.get("school", instance.school)
        instance.max_attempts = validated_data.get("max_attempts", instance.max_attempts)
        instance.lesson = validated_data.get("lesson", instance.lesson)
        instance.topic = validated_data.get("topic", instance.topic)
        instance.skill = validated_data.get("skill", instance.skill)
        instance.quiz_level = validated_data.get("quiz_level", instance.quiz_level)
        instance.difficulty = validated_data.get("difficulty", instance.difficulty)
        if "assigned_class" in validated_data:
            instance.assigned_class = validated_data["assigned_class"]
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
                q_skill = q_data.pop("skill", None) or instance.skill

                question = Question.objects.create(quiz=instance, skill=q_skill, **q_data)

                if q_data.get("question_type") == Question.TYPE_MCQ:
                    for a_data in answers_data:
                        Answer.objects.create(question=question, **a_data)
                elif q_data.get("question_type") == Question.TYPE_NUMERIC:
                    if correct_value is not None:
                        CorrectAnswer.objects.create(question=question, correct_value=correct_value)

                for h_data in hints_data:
                    Hint.objects.create(question=question, **h_data)

        return instance

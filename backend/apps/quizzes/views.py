from rest_framework import viewsets, serializers, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.db import models

from apps.accounts.models import Role
from apps.audit.services import log_activity
from .models import EngagementQuestion, Quiz, Lesson, AcademicTerm, Topic, Skill, QuizLevel, DifficultyLevel, LearningMaterial, VideoQuestion, MaterialAttachment
from .serializers import (
    QuizSerializer, 
    LessonSerializer, 
    AcademicTermSerializer, 
    TopicSerializer, 
    SkillSerializer, 
    QuizLevelSerializer, 
    DifficultyLevelSerializer,
    LearningMaterialSerializer,
    EngagementQuestionSerializer,
    VideoQuestionSerializer,
    MaterialAttachmentSerializer
)

class LearningMaterialViewSet(viewsets.ModelViewSet):
    queryset = LearningMaterial.objects.all().select_related(
        "created_by", "lesson", "quiz", "skill"
    ).prefetch_related(
        "engagement_questions", "video_questions", "attachments"
    ).order_by("order", "created_at", "id")
    serializer_class = LearningMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.is_role(Role.ROLE_TEACHER):
            qs = qs.filter(created_by=user)
        elif user.is_role(Role.ROLE_STUDENT):
            q_filter = models.Q(created_by__role__role_name=Role.ROLE_SYSTEM_ADMIN)
            if hasattr(user, 'student_profile') and user.student_profile.registered_by_id:
                q_filter |= models.Q(created_by_id=user.student_profile.registered_by_id)
            elif user.school_id:
                q_filter |= models.Q(school_id=user.school_id)
            qs = qs.filter(q_filter)

        lesson_id = self.request.query_params.get("lesson")
        topic_id = self.request.query_params.get("topic")
        skill_id = self.request.query_params.get("skill")
        skill_ids = self.request.query_params.get("skill_ids")
        quiz_id = self.request.query_params.get("quiz")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if skill_id:
            qs = qs.filter(skill_id=skill_id)
        if skill_ids:
            s_list = [int(x) for x in skill_ids.split(",") if x.strip().isdigit()]
            qs = qs.filter(skill_id__in=s_list)
        if quiz_id:
            try:
                quiz_obj = Quiz.objects.filter(id=quiz_id).first()
                if quiz_obj:
                    covered_skill_ids = [s.id for s in quiz_obj.get_covered_skills()]
                    qs = qs.filter(models.Q(skill_id__in=covered_skill_ids) | models.Q(quiz_id=quiz_obj.id))
                else:
                    qs = qs.filter(quiz_id=quiz_id)
            except Exception:
                qs = qs.filter(quiz_id=quiz_id)
        return qs

    def _validate_lesson_skill(self, lesson_id, skill_id):
        if lesson_id and skill_id:
            from .models import Skill
            skill = Skill.objects.filter(id=skill_id).first()
            if skill:
                skill_lesson_id = skill.lesson_id or (skill.topic.lesson_id if skill.topic else None)
                if skill_lesson_id and str(skill_lesson_id) != str(lesson_id):
                    raise serializers.ValidationError({"skill": "The selected skill does not belong to the selected lesson."})

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to create learning materials.")

        lesson = serializer.validated_data.get("lesson")
        skill = serializer.validated_data.get("skill")
        if lesson and skill:
            self._validate_lesson_skill(lesson.id, skill.id)

        if self.request.data.get("material_type") == "TEXT":
            content = self.request.data.get("content", "") or serializer.validated_data.get("content", "")
            attachments = self.request.FILES.getlist("attachments")
            if not content and not attachments:
                raise serializers.ValidationError({"content": "Either text content or at least one attachment is required for Note materials."})
                
        material = serializer.save(created_by=user)
        
        if self.request.data.get("material_type") == "TEXT":
            for f in self.request.FILES.getlist("attachments"):
                att_type = "PDF" if f.name.endswith(".pdf") or getattr(f, "content_type", "") == "application/pdf" else "IMAGE"
                MaterialAttachment.objects.create(material=material, file=f, attachment_type=att_type)

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to edit learning materials.")
            
        material = serializer.instance
        if user.is_role(Role.ROLE_TEACHER) and material.created_by != user:
            raise PermissionDenied("You do not have permission to edit this learning material.")

        lesson = serializer.validated_data.get("lesson", material.lesson)
        skill = serializer.validated_data.get("skill", material.skill)
        if lesson and skill:
            self._validate_lesson_skill(lesson.id, skill.id)

        material_type = self.request.data.get("material_type", material.material_type)
        if material_type == "TEXT":
            content = self.request.data.get("content", material.content) or serializer.validated_data.get("content", material.content)
            attachments = self.request.FILES.getlist("attachments")
            existing_count = material.attachments.count()
            if not content and existing_count == 0 and not attachments:
                raise serializers.ValidationError({"content": "Either text content or at least one attachment is required for Note materials."})
                
        serializer.save()
        
        if material_type == "TEXT":
            for f in self.request.FILES.getlist("attachments"):
                att_type = "PDF" if f.name.endswith(".pdf") or getattr(f, "content_type", "") == "application/pdf" else "IMAGE"
                MaterialAttachment.objects.create(material=material, file=f, attachment_type=att_type)

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to delete learning materials.")
        if user.is_role(Role.ROLE_TEACHER) and instance.created_by != user:
            raise PermissionDenied("You do not have permission to delete this learning material.")
        instance.delete()

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder_materials(self, request):
        user = request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        ordered_ids = request.data.get("ordered_ids")
        items = request.data.get("items")

        if ordered_ids is not None and isinstance(ordered_ids, list):
            items_to_update = [{"id": mat_id, "order": idx + 1} for idx, mat_id in enumerate(ordered_ids)]
        elif items is not None and isinstance(items, list):
            items_to_update = items
        else:
            return Response({"detail": "Either 'ordered_ids' or 'items' must be provided."}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = 0
        for item in items_to_update:
            mat_id = item.get("id")
            new_order = item.get("order")
            if mat_id is not None and new_order is not None:
                mat = LearningMaterial.objects.filter(id=mat_id).first()
                if mat and (user.is_role(Role.ROLE_SYSTEM_ADMIN) or mat.created_by_id == user.id):
                    mat.order = int(new_order)
                    mat.save(update_fields=["order"])
                    updated_count += 1

        return Response({"detail": f"Updated order for {updated_count} materials."}, status=status.HTTP_200_OK)

class VideoQuestionViewSet(viewsets.ModelViewSet):
    queryset = VideoQuestion.objects.all()
    serializer_class = VideoQuestionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        material_id = self.request.query_params.get("material")
        if material_id:
            qs = qs.filter(material_id=material_id)
        return qs

class MaterialAttachmentViewSet(viewsets.ModelViewSet):
    queryset = MaterialAttachment.objects.all()
    serializer_class = MaterialAttachmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        material_id = self.request.query_params.get("material")
        if material_id:
            qs = qs.filter(material_id=material_id)
        return qs



class AcademicTermViewSet(viewsets.ModelViewSet):
    queryset = AcademicTerm.objects.all().order_by("order")
    serializer_class = AcademicTermSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can create terms.")
        term = serializer.save()
        log_activity(
            user=user,
            action="CREATE",
            entity_type="CURRICULUM",
            entity_id=term.id,
            description=f"Created academic term {term.name}"
        )

    def perform_update(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can edit terms.")
        term = serializer.save()
        log_activity(
            user=user,
            action="UPDATE",
            entity_type="CURRICULUM",
            entity_id=term.id,
            description=f"Updated academic term {term.name}"
        )

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can delete terms.")
        name = instance.name
        t_id = instance.id
        instance.delete()
        log_activity(
            user=user,
            action="DELETE",
            entity_type="CURRICULUM",
            entity_id=t_id,
            description=f"Deleted academic term {name}"
        )

class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    
    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can create topics.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can edit topics.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to delete topics.")
        if instance.skills.filter(quizzes__isnull=False).exists():
            raise PermissionDenied("Cannot delete topic associated with active quizzes.")
        instance.delete()

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        topic_id = self.request.query_params.get("topic")
        lesson_id = self.request.query_params.get("lesson")
        active_only = self.request.query_params.get("active_only")
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        if active_only == "true":
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can create skills.")
        skill = serializer.save()
        lesson_title = skill.lesson.title if skill.lesson else ""
        desc = f"Added skill '{skill.name}' to {lesson_title}" if lesson_title else f"Added skill '{skill.name}'"
        log_activity(
            user=user,
            action="CREATE",
            entity_type="SKILL",
            entity_id=skill.id,
            description=desc,
            metadata={"lesson_id": skill.lesson_id, "skill_name": skill.name}
        )

    def perform_update(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can edit skills.")
        skill = serializer.save()
        lesson_title = skill.lesson.title if skill.lesson else ""
        desc = f"Updated skill '{skill.name}' in {lesson_title}" if lesson_title else f"Updated skill '{skill.name}'"
        log_activity(
            user=user,
            action="UPDATE",
            entity_type="SKILL",
            entity_id=skill.id,
            description=desc
        )

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can delete skills.")
        if instance.quizzes.exists() or instance.questions.exists():
            raise PermissionDenied("Cannot delete skill associated with active quizzes or questions.")
        name = instance.name
        s_id = instance.id
        lesson_title = instance.lesson.title if instance.lesson else ""
        desc = f"Removed skill '{name}' from {lesson_title}" if lesson_title else f"Removed skill '{name}'"
        instance.delete()
        log_activity(
            user=user,
            action="DELETE",
            entity_type="SKILL",
            entity_id=s_id,
            description=desc
        )

class QuizLevelViewSet(viewsets.ModelViewSet):
    queryset = QuizLevel.objects.all().order_by("order")
    serializer_class = QuizLevelSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

class DifficultyLevelViewSet(viewsets.ModelViewSet):
    queryset = DifficultyLevel.objects.all().order_by("order")
    serializer_class = DifficultyLevelSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        term = self.request.query_params.get("term")
        grade = self.request.query_params.get("grade")
        queryset = Lesson.objects.all().order_by("created_at")

        user = self.request.user
        if user.is_role(Role.ROLE_STUDENT):
            q_filter = models.Q(created_by__role__role_name=Role.ROLE_SYSTEM_ADMIN)
            if hasattr(user, 'student_profile') and user.student_profile.registered_by_id:
                q_filter |= models.Q(created_by_id=user.student_profile.registered_by_id)
            queryset = queryset.filter(q_filter)

        if term:
            queryset = queryset.filter(term=term)
        if grade:
            queryset = queryset.filter(grade=grade)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to create lessons.")
        lesson = serializer.save(created_by=user)
        log_activity(
            user=user,
            action="CREATE",
            entity_type="LESSON",
            entity_id=lesson.id,
            description=f"Created lesson {lesson.title}",
            metadata={"term_id": lesson.term_id, "title": lesson.title}
        )

    def perform_update(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to update lessons.")
        lesson = serializer.save()
        log_activity(
            user=user,
            action="UPDATE",
            entity_type="LESSON",
            entity_id=lesson.id,
            description=f"Updated lesson {lesson.title}"
        )

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to delete lessons.")
        if instance.quizzes.exists() or instance.topics.filter(skills__quizzes__isnull=False).exists():
            raise PermissionDenied("Cannot delete lesson associated with active quizzes.")
        title = instance.title
        l_id = instance.id
        instance.delete()
        log_activity(
            user=user,
            action="DELETE",
            entity_type="LESSON",
            entity_id=l_id,
            description=f"Deleted lesson {title}"
        )


def can_student_access_quiz(user, quiz):
    """
    Returns True if user (Student) is authorized to access quiz.
    Enforces:
    1. User is authenticated & is_role(Role.ROLE_STUDENT)
    2. Student profile exists with registered_by and class_room
    3. quiz.created_by_id == student.registered_by_id (Teacher Match)
    4. student.class_room_id == quiz.assigned_class_id OR student.class_room_id in quiz.assigned_classes (Class Match)
    5. quiz.status == STATUS_PUBLISHED
    """
    if not user or not user.is_authenticated or not user.is_role(Role.ROLE_STUDENT):
        return False

    if getattr(quiz, "is_deleted", False):
        return False

    student = getattr(user, "student_profile", None)
    if not student or not student.registered_by_id or not student.class_room_id:
        return False

    if quiz.created_by_id != student.registered_by_id:
        return False

    if quiz.status != "PUBLISHED":
        return False

    class_id = student.class_room_id
    if quiz.assigned_class_id == class_id:
        return True

    if quiz.assigned_classes.filter(id=class_id).exists():
        return True

    return False


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]

    def check_quiz_ownership(self, quiz):
        user = self.request.user
        if user.is_role(Role.ROLE_TEACHER) and quiz.created_by_id != user.id:
            raise PermissionDenied("You do not have permission to access or modify this quiz.")
        if user.is_role(Role.ROLE_STUDENT) and not can_student_access_quiz(user, quiz):
            raise PermissionDenied("You do not have permission to access this quiz.")

    def get_queryset(self):
        user = self.request.user
        queryset = Quiz.objects.filter(is_deleted=False).select_related(
            "created_by", "school", "lesson", "assigned_class", "quiz_level", "difficulty", "blueprint"
        ).prefetch_related(
            "questions__answers", "questions__hints", "questions__correct_answer", "assigned_classes"
        ).order_by("lesson__order", "quiz_level__order", "difficulty__order", "order", "id")

        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)

        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return queryset

        if user.is_role(Role.ROLE_TEACHER):
            return queryset.filter(created_by=user)

        if user.is_role(Role.ROLE_STUDENT):
            student_profile = getattr(user, 'student_profile', None)
            if not student_profile or not student_profile.registered_by_id or not student_profile.class_room_id:
                return Quiz.objects.none()

            teacher_id = student_profile.registered_by_id
            class_id = student_profile.class_room_id

            q_filter = models.Q(created_by_id=teacher_id) & models.Q(status="PUBLISHED")
            q_filter &= (models.Q(assigned_class_id=class_id) | models.Q(assigned_classes__id=class_id))
            return queryset.filter(q_filter).distinct().order_by("lesson__order", "quiz_level__order", "difficulty__order", "order", "id")

        return Quiz.objects.none()

    @action(detail=False, methods=['get'])
    def check_order(self, request):
        lesson_id = request.query_params.get("lesson")
        level_id = request.query_params.get("quiz_level") or request.query_params.get("level")
        difficulty_id = request.query_params.get("difficulty")
        order_val = request.query_params.get("order")
        exclude_id = request.query_params.get("exclude_id")

        if not (lesson_id and level_id and difficulty_id and order_val):
            return Response({"exists": False})

        qs = Quiz.objects.filter(
            is_deleted=False,
            lesson_id=lesson_id,
            quiz_level_id=level_id,
            difficulty_id=difficulty_id,
            order=order_val,
            created_by=request.user,
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)

        exists = qs.exists()
        return Response({
            "exists": exists,
            "message": "A quiz already exists at this order for the selected lesson, level, and difficulty. Please choose a different order number." if exists else ""
        })

    @action(detail=True, methods=['get'])
    def validate_bank(self, request, pk=None):
        from apps.quizzes.services.question_pool_service import validate_quiz_question_bank
        quiz = self.get_object()
        self.check_quiz_ownership(quiz)
        val_result = validate_quiz_question_bank(quiz)
        if val_result["valid"]:
            return Response(val_result, status=status.HTTP_200_OK)
        return Response(val_result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def attempt_questions(self, request, pk=None):
        from apps.quizzes.serializers import QuestionSerializer
        from apps.quizzes.services.question_pool_service import select_and_allocate_attempt_questions
        from apps.classes.models import Student

        quiz = self.get_object()
        self.check_quiz_ownership(quiz)
        user = request.user
        attempt_number = int(request.query_params.get("attempt_number", 1))

        student = None
        if hasattr(user, 'student_profile') or user.is_role(Role.ROLE_STUDENT):
            student, _ = Student.objects.get_or_create(user=user)

        try:
            questions = select_and_allocate_attempt_questions(student, quiz, "ORDINARY", attempt_number)
            serializer = QuestionSerializer(questions, many=True)
            return Response(serializer.data)
        except ValueError as ve:
            return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        from rest_framework import serializers as drf_serializers
        from apps.quizzes.services.question_pool_service import validate_quiz_question_bank
        user = self.request.user
        if not user.is_role(
            Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER
        ):
            raise PermissionDenied("You do not have permission to create quizzes.")
        quiz = serializer.save(created_by=user)

        if quiz.status == "PUBLISHED":
            val_result = validate_quiz_question_bank(quiz)
            if not val_result["valid"]:
                quiz.status = "DRAFT"
                quiz.save()
                raise drf_serializers.ValidationError({
                    "detail": "Quiz cannot be published due to insufficient question bank.",
                    "question_bank_validation": val_result
                })

    def perform_update(self, serializer):
        from rest_framework import serializers as drf_serializers
        from apps.quizzes.services.question_pool_service import validate_quiz_question_bank
        user = self.request.user
        quiz = self.get_object()
        self.check_quiz_ownership(quiz)

        target_status = self.request.data.get("status", quiz.status)
        if target_status == "PUBLISHED":
            instance = serializer.save()
            val_result = validate_quiz_question_bank(instance)
            if not val_result["valid"]:
                instance.status = "DRAFT"
                instance.save()
                raise drf_serializers.ValidationError({
                    "detail": "Quiz cannot be published due to insufficient question bank.",
                    "question_bank_validation": val_result
                })
            return

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            self.check_quiz_ownership(instance)
            instance.is_deleted = True
            instance.status = "UNPUBLISHED"
            instance.save()
        else:
            raise PermissionDenied("You do not have permission to delete quizzes.")

class EngagementQuestionViewSet(viewsets.ModelViewSet):
    queryset = EngagementQuestion.objects.all().order_by("order")
    serializer_class = EngagementQuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        material_id = self.request.query_params.get("material")
        if material_id:
            qs = qs.filter(material_id=material_id)
        return qs

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.db import models

from apps.accounts.models import Role
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
        "created_by", "lesson", "quiz"
    ).prefetch_related(
        "engagement_questions", "video_questions", "attachments"
    ).order_by("-created_at", "-id")
    serializer_class = LearningMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get("lesson")
        topic_id = self.request.query_params.get("topic")
        skill_id = self.request.query_params.get("skill")
        quiz_id = self.request.query_params.get("quiz")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if skill_id:
            qs = qs.filter(skill_id=skill_id)
        if quiz_id:
            qs = qs.filter(quiz_id=quiz_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to create learning materials.")
            
        if self.request.data.get("material_type") == "TEXT":
            attachments = self.request.FILES.getlist("attachments")
            if not attachments:
                raise PermissionDenied("At least one attachment is required for Note materials.")
                
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
        material_type = self.request.data.get("material_type", material.material_type)
        if material_type == "TEXT":
            attachments = self.request.FILES.getlist("attachments")
            existing_count = material.attachments.count()
            if existing_count == 0 and not attachments:
                raise PermissionDenied("At least one attachment is required for Note materials.")
                
        serializer.save()
        
        if material_type == "TEXT":
            for f in self.request.FILES.getlist("attachments"):
                att_type = "PDF" if f.name.endswith(".pdf") or getattr(f, "content_type", "") == "application/pdf" else "IMAGE"
                MaterialAttachment.objects.create(material=material, file=f, attachment_type=att_type)

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

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
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
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to delete skills.")
        if instance.quizzes.exists() or instance.questions.exists():
            raise PermissionDenied("Cannot delete skill associated with active quizzes or questions.")
        instance.delete()

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
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to create lessons.")
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to update lessons.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to delete lessons.")
        if instance.quizzes.exists() or instance.topics.filter(skills__quizzes__isnull=False).exists():
            raise PermissionDenied("Cannot delete lesson associated with active quizzes.")
        instance.delete()


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Quiz.objects.all().select_related(
            "created_by", "school", "lesson", "assigned_class", "quiz_level", "difficulty", "blueprint"
        ).prefetch_related(
            "questions__answers", "questions__hints", "questions__correct_answer"
        ).order_by("-id")

        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)

        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return queryset

        if user.is_role(Role.ROLE_TEACHER):
            school_id = user.school_id
            if school_id:
                return queryset.filter(
                    models.Q(school_id=school_id) | models.Q(school__isnull=True) | models.Q(created_by=user)
                )
            return queryset.filter(models.Q(school__isnull=True) | models.Q(created_by=user))

        if user.is_role(Role.ROLE_STUDENT):
            q_filter = models.Q(created_by__role__role_name=Role.ROLE_SYSTEM_ADMIN)
            if hasattr(user, 'student_profile') and user.student_profile.registered_by_id:
                q_filter |= models.Q(created_by_id=user.student_profile.registered_by_id)
            if user.school_id:
                q_filter |= models.Q(school_id=user.school_id)
            return queryset.filter(q_filter).order_by("order", "id")

        return Quiz.objects.none()

    @action(detail=True, methods=['get'])
    def attempt_questions(self, request, pk=None):
        from rest_framework.decorators import action
        from apps.quizzes.serializers import QuestionSerializer
        from apps.quizzes.services.question_pool_service import get_questions_for_attempt
        from apps.classes.models import Student

        quiz = self.get_object()
        user = request.user
        attempt_number = int(request.query_params.get("attempt_number", 1))

        student = None
        if hasattr(user, 'student_profile') or user.is_role(Role.ROLE_STUDENT):
            student, _ = Student.objects.get_or_create(user=user)

        questions = get_questions_for_attempt(student, quiz, attempt_number)
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_role(
            Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER
        ):
            raise PermissionDenied("You do not have permission to create quizzes.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        quiz = self.get_object()
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            serializer.save()
        elif user.is_role(Role.ROLE_TEACHER):
            if quiz.created_by == user or (user.school_id and quiz.school_id == user.school_id):
                serializer.save()
            else:
                raise PermissionDenied("You do not have permission to update this quiz.")
        else:
            raise PermissionDenied("You do not have permission to update quizzes.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            instance.delete()
        elif user.is_role(Role.ROLE_TEACHER):
            if instance.created_by == user or (user.school_id and instance.school_id == user.school_id):
                instance.delete()
            else:
                raise PermissionDenied("You do not have permission to delete this quiz.")
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

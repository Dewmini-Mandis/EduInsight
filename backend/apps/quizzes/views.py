from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.db import models

from apps.accounts.models import Role
from .models import EngagementQuestion, Quiz, Lesson, AcademicTerm, Topic, Skill, QuizLevel, DifficultyLevel, LearningMaterial
from .serializers import (
    QuizSerializer, 
    LessonSerializer, 
    AcademicTermSerializer, 
    TopicSerializer, 
    SkillSerializer, 
    QuizLevelSerializer, 
    DifficultyLevelSerializer,
    LearningMaterialSerializer,
    EngagementQuestionSerializer
)

class LearningMaterialViewSet(viewsets.ModelViewSet):
    queryset = LearningMaterial.objects.all().order_by("-created_at")
    serializer_class = LearningMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get("lesson")
        topic_id = self.request.query_params.get("topic")
        skill_id = self.request.query_params.get("skill")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if skill_id:
            qs = qs.filter(skill_id=skill_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to create learning materials.")
        serializer.save(created_by=user)



class AcademicTermViewSet(viewsets.ModelViewSet):
    queryset = AcademicTerm.objects.all().order_by("order")
    serializer_class = AcademicTermSerializer
    permission_classes = [IsAuthenticated]

class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        topic_id = self.request.query_params.get("topic")
        lesson_id = self.request.query_params.get("lesson")
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

class QuizLevelViewSet(viewsets.ModelViewSet):
    queryset = QuizLevel.objects.all().order_by("order")
    serializer_class = QuizLevelSerializer
    permission_classes = [IsAuthenticated]

class DifficultyLevelViewSet(viewsets.ModelViewSet):
    queryset = DifficultyLevel.objects.all().order_by("order")
    serializer_class = DifficultyLevelSerializer
    permission_classes = [IsAuthenticated]

class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        term = self.request.query_params.get("term")
        queryset = Lesson.objects.all().order_by("created_at")
        if term:
            queryset = queryset.filter(term=term)
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
        instance.delete()


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Quiz.objects.all().prefetch_related("questions__answers", "questions__correct_answer")

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
            school_id = user.school_id
            if school_id:
                return queryset.filter(models.Q(school_id=school_id) | models.Q(school__isnull=True))
            return queryset.filter(school__isnull=True)

        return Quiz.objects.none()

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

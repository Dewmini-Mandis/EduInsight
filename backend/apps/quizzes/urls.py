from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    QuizViewSet, 
    LessonViewSet, 
    AcademicTermViewSet, 
    TopicViewSet, 
    SkillViewSet, 
    QuizLevelViewSet, 
    DifficultyLevelViewSet,
    LearningMaterialViewSet,
    EngagementQuestionViewSet
)

router = DefaultRouter()
router.register(r"engagement-questions", EngagementQuestionViewSet, basename="engagement-question")
router.register(r"materials", LearningMaterialViewSet, basename="material")
router.register(r"terms", AcademicTermViewSet, basename="term")
router.register(r"lessons", LessonViewSet, basename="lesson")
router.register(r"topics", TopicViewSet, basename="topic")
router.register(r"skills", SkillViewSet, basename="skill")
router.register(r"quiz-levels", QuizLevelViewSet, basename="quiz-level")
router.register(r"difficulty-levels", DifficultyLevelViewSet, basename="difficulty-level")
router.register(r"", QuizViewSet, basename="quiz")

urlpatterns = [
    path("", include(router.urls)),
]


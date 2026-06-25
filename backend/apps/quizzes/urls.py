from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import QuizViewSet, LessonViewSet

router = DefaultRouter()
router.register(r"lessons", LessonViewSet, basename="lesson")
router.register(r"", QuizViewSet, basename="quiz")

urlpatterns = [
    path("", include(router.urls)),
]


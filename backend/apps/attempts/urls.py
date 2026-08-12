from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import QuizAttemptViewSet, ManualMarkViewSet, TeacherOverrideViewSet

router = DefaultRouter()
router.register(r"attempts", QuizAttemptViewSet, basename="attempt")
router.register(r"manual-marks", ManualMarkViewSet, basename="manual-mark")
router.register(r"overrides", TeacherOverrideViewSet, basename="override")

urlpatterns = [
    path("", include(router.urls)),
]

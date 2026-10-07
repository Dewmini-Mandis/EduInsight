from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import QuizAttemptViewSet, ManualMarkViewSet, TeacherOverrideViewSet, StudentLessonProgressViewSet, StudentContentProgressViewSet, StudentEngagementAnswerViewSet, StudentVideoAnswerViewSet, TeacherInterventionViewSet

router = DefaultRouter()
router.register(r"attempts", QuizAttemptViewSet, basename="attempt")
router.register(r"manual-marks", ManualMarkViewSet, basename="manual-mark")
router.register(r"overrides", TeacherOverrideViewSet, basename="override")
router.register(r"lesson-progress", StudentLessonProgressViewSet, basename="lesson-progress")
router.register(r"content-progress", StudentContentProgressViewSet, basename="content-progress")
router.register(r"engagement-answers", StudentEngagementAnswerViewSet, basename="engagement-answer")
router.register(r"video-answers", StudentVideoAnswerViewSet, basename="video-answer")
router.register(r"interventions", TeacherInterventionViewSet, basename="intervention")

urlpatterns = [
    path("", include(router.urls)),
]

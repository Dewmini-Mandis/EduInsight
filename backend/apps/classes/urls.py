from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolClassViewSet, TeacherClassroomViewSet, ClassroomAccessRequestViewSet

router = DefaultRouter()
router.register(r"classrooms", SchoolClassViewSet, basename="classroom")
router.register(r"teacher-assignments", TeacherClassroomViewSet, basename="teacher-assignment")
router.register(r"access-requests", ClassroomAccessRequestViewSet, basename="access-request")
router.register(r"", SchoolClassViewSet, basename="classroom-root")

urlpatterns = [
    path("", include(router.urls)),
]

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import Role
from .models import SchoolClass, TeacherClassroom, Student, TeacherProfile, ClassroomAccessRequest
from .serializers import SchoolClassSerializer, TeacherClassroomSerializer, StudentSerializer, TeacherProfileSerializer, ClassroomAccessRequestSerializer

class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return self.queryset.all()
        if user.is_role(Role.ROLE_TEACHER):
            return self.queryset.filter(teacherclassroom__teacher=user)
        if user.is_role(Role.ROLE_STUDENT):
            return self.queryset.filter(students__user=user)
        return self.queryset.none()

class TeacherClassroomViewSet(viewsets.ModelViewSet):
    queryset = TeacherClassroom.objects.all()
    serializer_class = TeacherClassroomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return self.queryset.all()
        if user.is_role(Role.ROLE_TEACHER):
            return self.queryset.filter(teacher=user)
        return self.queryset.none()

class ClassroomAccessRequestViewSet(viewsets.ModelViewSet):
    queryset = ClassroomAccessRequest.objects.all()
    serializer_class = ClassroomAccessRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return self.queryset.all()
        if user.is_role(Role.ROLE_TEACHER):
            return self.queryset.filter(teacher=user)
        return self.queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_TEACHER):
            raise PermissionDenied("Only teachers can request classroom access.")
        serializer.save(teacher=user)

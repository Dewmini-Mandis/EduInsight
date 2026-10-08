from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import Role
from .models import SchoolClass, TeacherClassroom, Student, TeacherProfile, ClassroomAccessRequest
from .serializers import SchoolClassSerializer, TeacherClassroomSerializer, StudentSerializer, TeacherProfileSerializer, ClassroomAccessRequestSerializer

class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all().select_related("school").prefetch_related("teacherclassroom_set__teacher")
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if self.request.query_params.get("include_inactive") != "true":
            qs = qs.filter(is_active=True)
        if self.request.query_params.get("teacher_assigned_only") == "true":
            qs = qs.filter(teacherclassroom__is_active=True).distinct()
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return qs
        if user.is_role(Role.ROLE_TEACHER):
            return qs.filter(teacherclassroom__teacher=user, teacherclassroom__is_active=True).distinct()
        if user.is_role(Role.ROLE_STUDENT):
            return qs.filter(students__user=user)
        return SchoolClass.objects.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to create classes.")

        name = request.data.get("name", "")
        if not isinstance(name, str) or not name.strip():
            return Response({"name": ["Class name is required."]}, status=status.HTTP_400_BAD_REQUEST)
        name = name.strip()

        school = getattr(user, 'school', None)
        if not school and request.data.get("school"):
            from apps.schools.models import School
            school = School.objects.filter(id=request.data.get("school")).first()

        if not school:
            from apps.schools.models import School
            school = School.objects.first()

        if not school:
            from apps.schools.models import School
            school = School.objects.create(name="Default School", location="Main Campus")

        school_class = SchoolClass.objects.filter(name__iexact=name, school=school).first()
        created = False
        if not school_class:
            school_class = SchoolClass.objects.create(name=name, school=school)
            created = True

        if user.is_role(Role.ROLE_TEACHER):
            TeacherClassroom.objects.get_or_create(teacher=user, classroom=school_class)

        serializer = self.get_serializer(school_class)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

from rest_framework.decorators import action

class TeacherClassroomViewSet(viewsets.ModelViewSet):
    queryset = TeacherClassroom.objects.select_related("teacher", "classroom__school")
    serializer_class = TeacherClassroomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return self.queryset.all()
        if user.is_role(Role.ROLE_TEACHER):
            return self.queryset.filter(teacher=user, is_active=True)
        return self.queryset.none()

    @action(detail=False, methods=["post", "delete"], url_path="remove-classroom")
    def remove_classroom(self, request):
        user = request.user
        if not user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            raise PermissionDenied("Only teachers and system administrators can remove classroom assignments.")
        
        classroom_id = request.data.get("classroom_id") or request.query_params.get("classroom_id")
        if not classroom_id:
            return Response({"detail": "classroom_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        tc = TeacherClassroom.objects.filter(teacher=user, classroom_id=classroom_id, is_active=True).first()
        if not tc:
            return Response({"detail": "Classroom assignment not found."}, status=status.HTTP_404_NOT_FOUND)

        if Student.objects.filter(registered_by=user, class_room_id=classroom_id).exists():
            return Response(
                {"detail": "This class cannot be removed because students are currently assigned to it. Reassign those students first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        tc.is_active = False
        tc.save()
        return Response({"message": "Classroom assignment removed successfully."}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if Student.objects.filter(registered_by=instance.teacher, class_room=instance.classroom).exists():
            return Response(
                {"detail": "This class cannot be removed because students are currently assigned to it. Reassign those students first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

class ClassroomAccessRequestViewSet(viewsets.ModelViewSet):
    queryset = ClassroomAccessRequest.objects.select_related("teacher", "classroom")
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

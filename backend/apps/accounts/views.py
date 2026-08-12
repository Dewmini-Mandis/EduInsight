from rest_framework import generics, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Role, User
from .serializers import (
	LoginSerializer,
	RegisterSerializer,
	ProfileUpdateSerializer,
	UserCreateSerializer,
	UserSerializer,
	UserUpdateSerializer,
	NotificationSerializer,
	SystemAccessLogSerializer,
)
from .models import Role, User, Notification


class RegisterView(generics.CreateAPIView):
	permission_classes = [AllowAny]
	serializer_class = RegisterSerializer

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		token, _ = Token.objects.get_or_create(user=user)
		return Response(
			{
				"token": token.key,
				"user": UserSerializer(user).data,
			},
			status=status.HTTP_201_CREATED,
		)


class LoginView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = LoginSerializer(data=request.data, context={"request": request})
		serializer.is_valid(raise_exception=True)
		user = serializer.validated_data["user"]
		token, _ = Token.objects.get_or_create(user=user)
		return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		Token.objects.filter(user=request.user).delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
	def get(self, request):
		return Response(UserSerializer(request.user).data)

	def patch(self, request):
		if request.user.is_role(Role.ROLE_STUDENT):
			raise PermissionDenied("Students cannot edit profile details.")
		serializer = ProfileUpdateSerializer(
			request.user, data=request.data, partial=True
		)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
	queryset = User.objects.select_related("role", "school")
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		queryset = self.queryset.all()
		role_param = self.request.query_params.get('role')
		if role_param:
			queryset = queryset.filter(role__role_name=role_param)
		if user.is_role(Role.ROLE_SYSTEM_ADMIN):
			return queryset
		if user.is_role(Role.ROLE_TEACHER):
			active_classrooms = [tc.classroom.id for tc in user.teacherclassroom_set.filter(is_active=True)]
			return queryset.filter(
				role__role_name=Role.ROLE_STUDENT,
				student_profile__class_room__id__in=active_classrooms
			)
		return queryset.none()

	def get_serializer_class(self):
		if self.action == "create":
			return UserCreateSerializer
		if self.action in ("update", "partial_update"):
			return UserUpdateSerializer
		return UserSerializer

	def update(self, request, *args, **kwargs):
		user = self.get_object()
		requester = request.user
		if user.is_role(Role.ROLE_SYSTEM_ADMIN) and not requester.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("System admin accounts cannot be modified by non-system admins.")
		if requester.is_role(Role.ROLE_TEACHER):
			if not user.is_role(Role.ROLE_STUDENT):
				raise PermissionDenied("You can only modify students.")
			active_classrooms = [tc.classroom.id for tc in requester.teacherclassroom_set.filter(is_active=True)]
			if not hasattr(user, 'student_profile') or user.student_profile.class_room_id not in active_classrooms:
				raise PermissionDenied("You can only modify students in your assigned classrooms.")
		return super().update(request, *args, **kwargs)

	def partial_update(self, request, *args, **kwargs):
		user = self.get_object()
		requester = request.user
		if user.is_role(Role.ROLE_SYSTEM_ADMIN) and not requester.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("System admin accounts cannot be modified by non-system admins.")
		if requester.is_role(Role.ROLE_TEACHER):
			if not user.is_role(Role.ROLE_STUDENT):
				raise PermissionDenied("You can only modify students.")
			active_classrooms = [tc.classroom.id for tc in requester.teacherclassroom_set.filter(is_active=True)]
			if not hasattr(user, 'student_profile') or user.student_profile.class_room_id not in active_classrooms:
				raise PermissionDenied("You can only modify students in your assigned classrooms.")
		return super().partial_update(request, *args, **kwargs)

	def destroy(self, request, *args, **kwargs):
		user = self.get_object()
		requester = request.user
		if user.is_role(Role.ROLE_SYSTEM_ADMIN) and not requester.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("System admin accounts cannot be deleted by non-system admins.")
		if requester.is_role(Role.ROLE_TEACHER):
			if not user.is_role(Role.ROLE_STUDENT):
				raise PermissionDenied("You can only delete students.")
			active_classrooms = [tc.classroom.id for tc in requester.teacherclassroom_set.filter(is_active=True)]
			if not hasattr(user, 'student_profile') or user.student_profile.class_room_id not in active_classrooms:
				raise PermissionDenied("You can only delete students in your assigned classrooms.")
		return super().destroy(request, *args, **kwargs)

	def perform_create(self, serializer):
		requester = self.request.user
		role = serializer.validated_data.get("role")
		if not role:
			raise ValidationError({"role": "Role is required."})

		if requester.is_role(Role.ROLE_SYSTEM_ADMIN):
			allowed_roles = {Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER, Role.ROLE_STUDENT}
		elif requester.is_role(Role.ROLE_TEACHER):
			allowed_roles = {Role.ROLE_STUDENT}
		else:
			raise PermissionDenied("You do not have permission to create users.")

		if role.role_name not in allowed_roles:
			raise PermissionDenied("You are not allowed to create this role.")

		if role.role_name in (Role.ROLE_TEACHER, Role.ROLE_STUDENT):
			if not requester.is_role(Role.ROLE_TEACHER) and not serializer.validated_data.get("school"):
				raise ValidationError({"school_id": "School is required."})

		if requester.is_role(Role.ROLE_TEACHER):
			if not requester.school:
				raise ValidationError("Teacher must belong to a school.")
			serializer.validated_data["school"] = requester.school

		if role.role_name != Role.ROLE_STUDENT:
			serializer.validated_data["username"] = serializer.validated_data.get(
				"email"
			)

		serializer.save()

	def perform_update(self, serializer):
		requester = self.request.user
		target = self.get_object()
		if requester.is_role(Role.ROLE_TEACHER):
			if not target.is_role(Role.ROLE_STUDENT):
				raise PermissionDenied("You can only manage students.")
			active_classrooms = [tc.classroom.id for tc in requester.teacherclassroom_set.filter(is_active=True)]
			if not hasattr(target, 'student_profile') or target.student_profile.class_room_id not in active_classrooms:
				raise PermissionDenied("You can only manage students in your assigned classrooms.")
		serializer.save()

class NotificationViewSet(viewsets.ModelViewSet):
	serializer_class = NotificationSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		return Notification.objects.filter(user=self.request.user).order_by('-created_at')

	def perform_create(self, serializer):
		serializer.save(user=self.request.user)


from .models import SystemAccessLog
class SystemAccessLogViewSet(viewsets.ReadOnlyModelViewSet):
	queryset = SystemAccessLog.objects.all()
	serializer_class = SystemAccessLogSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		if user.is_role("SYSTEM_ADMIN"):
			return SystemAccessLog.objects.all()
		return SystemAccessLog.objects.none()

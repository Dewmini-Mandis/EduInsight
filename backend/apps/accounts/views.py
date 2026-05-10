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
)


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
		if user.is_role(Role.ROLE_SYSTEM_ADMIN):
			return self.queryset
		if user.is_role(Role.ROLE_NATIONAL_ADMIN):
			return self.queryset.filter(role__role_name=Role.ROLE_SCHOOL_ADMIN)
		if user.is_role(Role.ROLE_SCHOOL_ADMIN):
			return self.queryset.filter(
				role__role_name__in=[Role.ROLE_TEACHER, Role.ROLE_STUDENT],
				school=user.school,
			)
		return self.queryset.none()

	def get_serializer_class(self):
		if self.action == "create":
			return UserCreateSerializer
		if self.action in ("update", "partial_update"):
			return UserUpdateSerializer
		return UserSerializer

	def update(self, request, *args, **kwargs):
		user = self.get_object()
		if user.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("System admin accounts cannot be modified.")
		return super().update(request, *args, **kwargs)

	def partial_update(self, request, *args, **kwargs):
		user = self.get_object()
		if user.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("System admin accounts cannot be modified.")
		return super().partial_update(request, *args, **kwargs)

	def destroy(self, request, *args, **kwargs):
		user = self.get_object()
		if user.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("System admin accounts cannot be deleted.")
		return super().destroy(request, *args, **kwargs)

	def perform_create(self, serializer):
		requester = self.request.user
		role = serializer.validated_data.get("role")
		if not role:
			raise ValidationError({"role": "Role is required."})

		if requester.is_role(Role.ROLE_SYSTEM_ADMIN):
			allowed_roles = {Role.ROLE_NATIONAL_ADMIN}
		elif requester.is_role(Role.ROLE_NATIONAL_ADMIN):
			allowed_roles = {Role.ROLE_SCHOOL_ADMIN}
		elif requester.is_role(Role.ROLE_SCHOOL_ADMIN):
			allowed_roles = {Role.ROLE_TEACHER, Role.ROLE_STUDENT}
		else:
			raise PermissionDenied("You do not have permission to create users.")

		if role.role_name not in allowed_roles:
			raise PermissionDenied("You are not allowed to create this role.")

		if role.role_name == Role.ROLE_SCHOOL_ADMIN:
			if not serializer.validated_data.get("school"):
				raise ValidationError({"school_id": "School is required."})

		if requester.is_role(Role.ROLE_SCHOOL_ADMIN):
			if not requester.school:
				raise ValidationError("School admin must belong to a school.")
			serializer.validated_data["school"] = requester.school

		if role.role_name != Role.ROLE_STUDENT:
			serializer.validated_data["username"] = serializer.validated_data.get(
				"email"
			)

		serializer.save()

	def perform_update(self, serializer):
		requester = self.request.user
		target = self.get_object()
		if requester.is_role(Role.ROLE_NATIONAL_ADMIN) and not target.is_role(
			Role.ROLE_SCHOOL_ADMIN
		):
			raise PermissionDenied("You can only manage school admins.")
		if requester.is_role(Role.ROLE_SCHOOL_ADMIN):
			if not target.is_role(Role.ROLE_TEACHER, Role.ROLE_STUDENT):
				raise PermissionDenied("You can only manage teachers and students.")
			if target.school_id != requester.school_id:
				raise PermissionDenied("You can only manage your school users.")
		serializer.save()

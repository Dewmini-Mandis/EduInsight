from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
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
from apps.audit.services import log_activity


class RegisterView(generics.CreateAPIView):
	permission_classes = [AllowAny]
	serializer_class = RegisterSerializer

	def create(self, request, *args, **kwargs):
		requested_role = request.data.get("role")
		if requested_role in [Role.ROLE_TEACHER, "TEACHER"]:
			raise PermissionDenied("Teacher self-registration is disabled. Teacher accounts must be created by a System Administrator.")
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


def _get_prefetched_user(user_obj):
	if not user_obj or not getattr(user_obj, "pk", None):
		return user_obj
	return User.objects.filter(pk=user_obj.pk).select_related(
		"role", "school", "student_profile__registered_by", "student_profile__class_room", "teacher_profile"
	).prefetch_related("teacherclassroom_set__classroom").first() or user_obj


class LoginView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = LoginSerializer(data=request.data, context={"request": request})
		serializer.is_valid(raise_exception=True)
		user = serializer.validated_data["user"]
		token, _ = Token.objects.get_or_create(user=user)
		prefetched_user = _get_prefetched_user(user)
		return Response({"token": token.key, "user": UserSerializer(prefetched_user).data})


class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		Token.objects.filter(user=request.user).delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
	def get(self, request):
		user = _get_prefetched_user(request.user)
		return Response(UserSerializer(user).data)

	def patch(self, request):
		if request.user.is_role(Role.ROLE_STUDENT):
			raise PermissionDenied("Students cannot edit profile details.")
		serializer = ProfileUpdateSerializer(
			request.user, data=request.data, partial=True
		)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		user = _get_prefetched_user(request.user)
		return Response(UserSerializer(user).data)


class UserViewSet(viewsets.ModelViewSet):
	queryset = User.objects.select_related("role", "school", "student_profile__registered_by", "student_profile__class_room", "teacher_profile").prefetch_related("teacherclassroom_set__classroom", "student_profile__class_room__teacherclassroom_set__teacher")
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		queryset = self.queryset.all()
		role_param = self.request.query_params.get('role')
		if role_param:
			queryset = queryset.filter(role__role_name=role_param)

		# Support ordering by creation date
		ordering_param = self.request.query_params.get('ordering') or self.request.query_params.get('sort')
		if ordering_param in ['-date_joined', 'created_at_desc', '-created_at']:
			queryset = queryset.order_by('-date_joined', '-id')
		elif ordering_param in ['date_joined', 'created_at_asc', 'created_at']:
			queryset = queryset.order_by('date_joined', 'id')
		else:
			queryset = queryset.order_by('-date_joined', '-id')

		if user.is_role(Role.ROLE_SYSTEM_ADMIN):
			return queryset
		if user.is_role(Role.ROLE_TEACHER):
			from django.db.models import Q
			teacher_class_ids = user.teacherclassroom_set.filter(is_active=True).values_list('classroom_id', flat=True)
			return queryset.filter(
				role__role_name=Role.ROLE_STUDENT
			).filter(
				Q(student_profile__registered_by=user) | Q(student_profile__class_room_id__in=teacher_class_ids)
			).distinct()
		return queryset.none()

	@action(detail=False, methods=["get"], url_path="stats")
	def stats(self, request):
		user = request.user
		if not user.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("Only System Administrators can view user role statistics.")
		teachers_count = User.objects.filter(role__role_name=Role.ROLE_TEACHER).count()
		students_count = User.objects.filter(role__role_name=Role.ROLE_STUDENT).count()
		return Response({
			"teachers": teachers_count,
			"students": students_count,
			"total": teachers_count + students_count,
		})

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
			if not hasattr(user, 'student_profile') or user.student_profile.registered_by_id != requester.id:
				raise PermissionDenied("You can only modify students assigned to you.")
		return super().update(request, *args, **kwargs)

	def partial_update(self, request, *args, **kwargs):
		user = self.get_object()
		requester = request.user
		if user.is_role(Role.ROLE_SYSTEM_ADMIN) and not requester.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("System admin accounts cannot be modified by non-system admins.")
		if requester.is_role(Role.ROLE_TEACHER):
			if not user.is_role(Role.ROLE_STUDENT):
				raise PermissionDenied("You can only modify students.")
			if not hasattr(user, 'student_profile') or user.student_profile.registered_by_id != requester.id:
				raise PermissionDenied("You can only modify students assigned to you.")
		return super().partial_update(request, *args, **kwargs)

	def destroy(self, request, *args, **kwargs):
		user = self.get_object()
		requester = request.user
		if user.is_role(Role.ROLE_SYSTEM_ADMIN) and not requester.is_role(Role.ROLE_SYSTEM_ADMIN):
			raise PermissionDenied("System admin accounts cannot be deleted by non-system admins.")
		if requester.is_role(Role.ROLE_TEACHER):
			if not user.is_role(Role.ROLE_STUDENT):
				raise PermissionDenied("You can only delete students.")
			if not hasattr(user, 'student_profile') or user.student_profile.registered_by_id != requester.id:
				raise PermissionDenied("You can only delete students assigned to you.")
		
		target_name = f"{user.first_name} {user.last_name}".strip() or user.username
		target_role = "TEACHER" if user.is_role(Role.ROLE_TEACHER) else "STUDENT" if user.is_role(Role.ROLE_STUDENT) else "USER"
		target_id = user.id

		res = super().destroy(request, *args, **kwargs)

		log_activity(
			user=requester,
			action="DELETE",
			entity_type=target_role,
			entity_id=target_id,
			description=f"Deleted {target_role.lower()} {target_name}"
		)
		return res

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

		if requester.is_role(Role.ROLE_TEACHER):
			if requester.school:
				serializer.validated_data["school"] = requester.school

		if role.role_name != Role.ROLE_STUDENT:
			serializer.validated_data["username"] = serializer.validated_data.get(
				"email"
			)

		created_user = serializer.save()

		name = f"{created_user.first_name} {created_user.last_name}".strip() or created_user.username
		if role.role_name == Role.ROLE_TEACHER:
			classrooms = [tc.classroom.name for tc in created_user.teacherclassroom_set.filter(is_active=True).select_related("classroom")]
			desc = f"Created teacher {name}"
			if classrooms:
				desc += f" with assigned classes: {', '.join(classrooms)}"
			log_activity(
				user=requester,
				action="CREATE",
				entity_type="TEACHER",
				entity_id=created_user.id,
				description=desc,
				metadata={"email": created_user.email, "classrooms": classrooms}
			)
		elif role.role_name == Role.ROLE_STUDENT:
			desc = f"Created student {name}"
			student_prof = getattr(created_user, 'student_profile', None)
			c_name = student_prof.class_room.name if (student_prof and student_prof.class_room) else getattr(student_prof, 'class_name', '')
			if c_name:
				desc += f" assigned to class {c_name}"
			log_activity(
				user=requester,
				action="CREATE",
				entity_type="STUDENT",
				entity_id=created_user.id,
				description=desc,
				metadata={"index_no": getattr(student_prof, 'index_no', ''), "class_name": c_name}
			)

	def perform_update(self, serializer):
		requester = self.request.user
		target = self.get_object()
		old_active = target.is_active
		old_teacher_classes = []
		if target.is_role(Role.ROLE_TEACHER):
			old_teacher_classes = list(target.teacherclassroom_set.filter(is_active=True).values_list("classroom__name", flat=True))

		old_student_class = ""
		if target.is_role(Role.ROLE_STUDENT) and hasattr(target, "student_profile") and target.student_profile and target.student_profile.class_room:
			old_student_class = target.student_profile.class_room.name

		if requester.is_role(Role.ROLE_TEACHER):
			if not target.is_role(Role.ROLE_STUDENT):
				raise PermissionDenied("You can only manage students.")
			if not hasattr(target, 'student_profile') or target.student_profile.registered_by_id != requester.id:
				raise PermissionDenied("You can only manage students assigned to you.")
		
		updated_user = serializer.save()
		name = f"{updated_user.first_name} {updated_user.last_name}".strip() or updated_user.username

		if old_active != updated_user.is_active:
			act = "ACTIVATE" if updated_user.is_active else "DEACTIVATE"
			desc = f"{'Activated' if updated_user.is_active else 'Deactivated'} {'teacher' if updated_user.is_role(Role.ROLE_TEACHER) else 'student'} {name}"
			log_activity(
				user=requester,
				action=act,
				entity_type="TEACHER" if updated_user.is_role(Role.ROLE_TEACHER) else "STUDENT",
				entity_id=updated_user.id,
				description=desc
			)

		if updated_user.is_role(Role.ROLE_TEACHER):
			new_teacher_classes = list(updated_user.teacherclassroom_set.filter(is_active=True).values_list("classroom__name", flat=True))
			if set(old_teacher_classes) != set(new_teacher_classes):
				if new_teacher_classes:
					log_activity(
						user=requester,
						action="ASSIGN",
						entity_type="TEACHER",
						entity_id=updated_user.id,
						description=f"Assigned classes {', '.join(new_teacher_classes)} to {name}",
						metadata={"classes": new_teacher_classes}
					)
				else:
					log_activity(
						user=requester,
						action="UNASSIGN",
						entity_type="TEACHER",
						entity_id=updated_user.id,
						description=f"Removed all assigned classes from {name}"
					)
			else:
				log_activity(
					user=requester,
					action="UPDATE",
					entity_type="TEACHER",
					entity_id=updated_user.id,
					description=f"Updated teacher {name}"
				)
		elif updated_user.is_role(Role.ROLE_STUDENT):
			new_student_class = ""
			if hasattr(updated_user, "student_profile") and updated_user.student_profile and updated_user.student_profile.class_room:
				new_student_class = updated_user.student_profile.class_room.name
			
			if old_student_class != new_student_class and new_student_class:
				log_activity(
					user=requester,
					action="ASSIGN",
					entity_type="STUDENT",
					entity_id=updated_user.id,
					description=f"Moved student {name} to class {new_student_class}"
				)
			else:
				log_activity(
					user=requester,
					action="UPDATE",
					entity_type="STUDENT",
					entity_id=updated_user.id,
					description=f"Updated student {name}"
				)

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

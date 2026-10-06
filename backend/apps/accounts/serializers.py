from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Role, User, Notification

from apps.classes.models import Student, TeacherProfile
from apps.schools.models import School

from .models import Role, User


from common.scope_constants import FIXED_SUBJECT

class RoleSerializer(serializers.ModelSerializer):
	class Meta:
		model = Role
		fields = ["id", "role_name"]


class UserSerializer(serializers.ModelSerializer):
	role = serializers.SlugRelatedField(read_only=True, slug_field="role_name")
	school_id = serializers.PrimaryKeyRelatedField(source="school", read_only=True)
	school_name = serializers.CharField(source="school.name", read_only=True)
	full_name = serializers.SerializerMethodField()
	student_id = serializers.SerializerMethodField()
	student_profile = serializers.SerializerMethodField()
	teacher_profile = serializers.SerializerMethodField()
	created_at = serializers.DateTimeField(source="date_joined", read_only=True)

	class Meta:
		model = User
		fields = [
			"id",
			"username",
			"email",
			"first_name",
			"last_name",
			"full_name",
			"role",
			"school_id",
			"school_name",
			"student_id",
			"student_profile",
			"teacher_profile",
			"is_active",
			"must_change_password",
			"date_joined",
			"created_at",
		]

	def get_full_name(self, obj: User) -> str:
		name = f"{obj.first_name} {obj.last_name}".strip()
		return name if name else obj.username

	def get_student_id(self, obj: User):
		return obj.student_profile.id if hasattr(obj, "student_profile") and obj.student_profile else None

	def get_student_profile(self, obj: User):
		if not hasattr(obj, "student_profile") or not obj.student_profile:
			return None
		profile = obj.student_profile
		reg_by = profile.registered_by
		return {
			"id": profile.id,
			"index_no": profile.index_no,
			"grade": profile.grade,
			"class_name": profile.class_name,
			"class_room": {"id": profile.class_room.id, "name": profile.class_room.name} if profile.class_room else None,
			"assigned_teacher_id": reg_by.id if reg_by else None,
			"assigned_teacher_name": (reg_by.get_full_name() or reg_by.username) if reg_by else None,
			"assigned_teacher_email": reg_by.email if reg_by else None,
		}

	def get_teacher_profile(self, obj: User):
		if not obj.is_role(Role.ROLE_TEACHER):
			return None
		profile = getattr(obj, "teacher_profile", None)
		return {
			"subjects": profile.subjects if profile else [],
			"classrooms": [{"id": c.classroom.id, "name": c.classroom.name} for c in obj.teacherclassroom_set.filter(is_active=True).select_related("classroom")],
		}


class UserCreateSerializer(serializers.ModelSerializer):
	username = serializers.CharField(required=False, allow_blank=True)
	password = serializers.CharField(write_only=True, min_length=8)
	role = serializers.SlugRelatedField(
		slug_field="role_name", queryset=Role.objects.all()
	)
	school_id = serializers.PrimaryKeyRelatedField(
		source="school",
		queryset=School.objects.all(),
		allow_null=True,
		required=False,
	)
	index_no = serializers.CharField(write_only=True, required=False, allow_blank=True)
	grade = serializers.CharField(write_only=True, required=False, allow_blank=True)
	class_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
	class_room_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
	assigned_teacher_id = serializers.PrimaryKeyRelatedField(
		queryset=User.objects.filter(role__role_name=Role.ROLE_TEACHER),
		required=False,
		allow_null=True,
		write_only=True,
	)
	subjects = serializers.ListField(
		child=serializers.CharField(), write_only=True, required=False
	)
	classrooms = serializers.ListField(
		child=serializers.CharField(), write_only=True, required=False
	)

	class Meta:
		model = User
		fields = [
			"id",
			"username",
			"email",
			"password",
			"first_name",
			"last_name",
			"role",
			"school_id",
			"index_no",
			"grade",
			"class_name",
			"class_room_id",
			"assigned_teacher_id",
			"subjects",
			"classrooms",
		]

	def to_internal_value(self, data):
		data = data.copy() if hasattr(data, "copy") else dict(data)
		if not data.get("username") and data.get("email"):
			data["username"] = data.get("email")
		return super().to_internal_value(data)

	def validate(self, attrs):
		attrs = super().validate(attrs)
		role = attrs.get("role")
		request = self.context.get("request")
		requester = request.user if request else None

		if role and role.role_name == Role.ROLE_STUDENT:
			assigned_teacher = attrs.get("assigned_teacher_id")
			class_room_id = attrs.get("class_room_id")
			reg_by = None
			if requester and requester.is_role(Role.ROLE_TEACHER):
				reg_by = requester
			elif assigned_teacher:
				reg_by = assigned_teacher
			elif requester and requester.is_role(Role.ROLE_SYSTEM_ADMIN):
				reg_by = assigned_teacher

			if class_room_id and reg_by:
				from apps.classes.models import TeacherClassroom
				if not TeacherClassroom.objects.filter(teacher=reg_by, classroom_id=class_room_id, is_active=True).exists():
					raise serializers.ValidationError({"class_room_id": "The selected class is not assigned to this teacher."})
		return attrs

	def validate_email(self, value):
		if value and User.objects.filter(email__iexact=value).exists():
			raise serializers.ValidationError("An account with this email address already exists.")
		return value

	def create(self, validated_data):
		role = validated_data.get("role")
		if role and role.role_name != Role.ROLE_STUDENT:
			email_val = validated_data.get("email")
			if email_val:
				validated_data["username"] = email_val
		password = validated_data.pop("password")
		index_no = validated_data.pop("index_no", "")
		grade = validated_data.pop("grade", "")
		class_name = validated_data.pop("class_name", "")
		class_room_id = validated_data.pop("class_room_id", None)
		assigned_teacher = validated_data.pop("assigned_teacher_id", None)
		subjects = validated_data.pop("subjects", [])
		classrooms = validated_data.pop("classrooms", [])
		validated_data["must_change_password"] = True
		user = User.objects.create_user(password=password, **validated_data)

		request = self.context.get("request")
		requester = request.user if request else None

		if role and role.role_name == Role.ROLE_STUDENT:
			reg_by = None
			if requester and requester.is_role(Role.ROLE_TEACHER):
				reg_by = requester
			elif assigned_teacher:
				reg_by = assigned_teacher
			elif requester and requester.is_role(Role.ROLE_SYSTEM_ADMIN):
				reg_by = assigned_teacher

			student = Student.objects.create(
				user=user,
				index_no=index_no,
				grade=grade,
				class_name=class_name,
				registered_by=reg_by
			)
			if class_room_id:
				from apps.classes.models import SchoolClass
				try:
					sc = SchoolClass.objects.get(id=class_room_id)
					student.class_room = sc
					student.save()
				except SchoolClass.DoesNotExist:
					pass
		if role and role.role_name == Role.ROLE_TEACHER:
			TeacherProfile.objects.create(user=user, subjects=subjects or [FIXED_SUBJECT])
			if classrooms:
				from apps.classes.models import SchoolClass, TeacherClassroom
				for c_val in classrooms:
					sc = None
					c_str = str(c_val).strip()
					if c_str.isdigit():
						sc = SchoolClass.objects.filter(id=int(c_str)).first()
					if not sc and c_str:
						sc = SchoolClass.objects.filter(name__iexact=c_str).first()
						if not sc:
							school = user.school or School.objects.first()
							if school:
								sc = SchoolClass.objects.create(name=c_str, school=school)
					if sc:
						TeacherClassroom.objects.get_or_create(teacher=user, classroom=sc)
		return user


class UserStatusSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ["is_active"]


class UserUpdateSerializer(serializers.ModelSerializer):
	role = serializers.SlugRelatedField(
		slug_field="role_name", queryset=Role.objects.all(), required=False
	)
	school_id = serializers.PrimaryKeyRelatedField(
		source="school",
		queryset=School.objects.all(),
		allow_null=True,
		required=False,
	)
	index_no = serializers.CharField(write_only=True, required=False, allow_blank=True)
	grade = serializers.CharField(write_only=True, required=False, allow_blank=True)
	class_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
	class_room_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
	assigned_teacher_id = serializers.PrimaryKeyRelatedField(
		queryset=User.objects.filter(role__role_name=Role.ROLE_TEACHER),
		required=False,
		allow_null=True,
		write_only=True,
	)
	subjects = serializers.ListField(
		child=serializers.CharField(), write_only=True, required=False
	)
	classrooms = serializers.ListField(
		child=serializers.CharField(), write_only=True, required=False
	)
	password = serializers.CharField(write_only=True, required=False, min_length=8)

	def validate(self, attrs):
		attrs = super().validate(attrs)
		role = attrs.get("role") or (self.instance.role if self.instance else None)
		request = self.context.get("request")
		requester = request.user if request else None

		if self.instance and role and role.role_name == Role.ROLE_STUDENT:
			student = getattr(self.instance, "student_profile", None)
			assigned_teacher = attrs.get("assigned_teacher_id")
			class_room_id = attrs.get("class_room_id")
			target_teacher = assigned_teacher if (assigned_teacher and requester and requester.is_role(Role.ROLE_SYSTEM_ADMIN)) else (student.registered_by if student else None)
			if not target_teacher and requester and requester.is_role(Role.ROLE_TEACHER):
				target_teacher = requester

			target_class_id = class_room_id if class_room_id is not None else (student.class_room_id if student else None)

			if target_class_id and target_teacher:
				from apps.classes.models import TeacherClassroom
				if not TeacherClassroom.objects.filter(teacher=target_teacher, classroom_id=target_class_id, is_active=True).exists():
					raise serializers.ValidationError({"class_room_id": "The selected class is not assigned to this teacher."})
		return attrs

	class Meta:
		model = User
		fields = [
			"first_name",
			"last_name",
			"email",
			"password",
			"role",
			"school_id",
			"is_active",
			"index_no",
			"grade",
			"class_name",
			"class_room_id",
			"assigned_teacher_id",
			"subjects",
			"classrooms",
		]

	def update(self, instance, validated_data):
		index_no = validated_data.pop("index_no", None)
		grade = validated_data.pop("grade", None)
		class_name = validated_data.pop("class_name", None)
		class_room_id = validated_data.pop("class_room_id", None)
		assigned_teacher = validated_data.pop("assigned_teacher_id", None)
		subjects = validated_data.pop("subjects", None)
		classrooms = validated_data.pop("classrooms", None)
		password = validated_data.pop("password", None)
		role = validated_data.get("role") or instance.role

		instance = super().update(instance, validated_data)

		if password:
			instance.set_password(password)
			instance.save(update_fields=["password"])

		request = self.context.get("request")
		requester = request.user if request else None

		if role and role.role_name == Role.ROLE_STUDENT:
			student, _ = Student.objects.get_or_create(user=instance)
			if index_no is not None:
				student.index_no = index_no
			if grade is not None:
				student.grade = grade
			if class_name is not None:
				student.class_name = class_name
			target_teacher = assigned_teacher if (assigned_teacher and requester and requester.is_role(Role.ROLE_SYSTEM_ADMIN)) else student.registered_by
			if not target_teacher and requester and requester.is_role(Role.ROLE_TEACHER):
				target_teacher = requester
			if assigned_teacher is not None and requester and requester.is_role(Role.ROLE_SYSTEM_ADMIN):
				student.registered_by = assigned_teacher
			if class_room_id is not None:
				from apps.classes.models import SchoolClass
				if class_room_id:
					try:
						sc = SchoolClass.objects.get(id=class_room_id)
						student.class_room = sc
					except SchoolClass.DoesNotExist:
						student.class_room = None
				else:
					student.class_room = None
			student.save()
		elif role and role.role_name == Role.ROLE_TEACHER:
			teacher, _ = TeacherProfile.objects.get_or_create(user=instance)
			if subjects is not None:
				teacher.subjects = subjects
				teacher.save()
			if classrooms is not None:
				from apps.classes.models import SchoolClass, TeacherClassroom
				TeacherClassroom.objects.filter(teacher=instance).update(is_active=False)
				for class_val in classrooms:
					sc = None
					c_str = str(class_val).strip()
					if c_str.isdigit():
						sc = SchoolClass.objects.filter(id=int(c_str)).first()
					if not sc and c_str:
						sc = SchoolClass.objects.filter(name__iexact=c_str).first()
						if not sc:
							school = instance.school or School.objects.first()
							if school:
								sc = SchoolClass.objects.create(name=c_str, school=school)
					if sc:
						tc, _ = TeacherClassroom.objects.get_or_create(teacher=instance, classroom=sc)
						tc.is_active = True
						tc.save()
		return User.objects.get(pk=instance.pk)

	def to_representation(self, instance):
		return UserSerializer(instance, context=self.context).data


class ProfileUpdateSerializer(serializers.ModelSerializer):
	current_password = serializers.CharField(write_only=True, required=False)
	new_password = serializers.CharField(write_only=True, required=False)
	classrooms = serializers.ListField(
		child=serializers.CharField(max_length=100),
		write_only=True,
		required=False
	)

	class Meta:
		model = User
		fields = ["first_name", "last_name", "email", "current_password", "new_password", "classrooms"]

	def validate(self, attrs):
		current_password = attrs.get("current_password")
		new_password = attrs.get("new_password")
		if new_password:
			if not current_password:
				raise serializers.ValidationError(
					{"current_password": "Current password is required to change password."}
				)
			if not self.instance.check_password(current_password):
				raise serializers.ValidationError(
					{"current_password": "Current password is incorrect."}
				)
		return attrs

	def update(self, instance, validated_data):
		validated_data.pop("current_password", None)
		new_password = validated_data.pop("new_password", None)
		classrooms = validated_data.pop("classrooms", None)
		
		instance = super().update(instance, validated_data)
		
		if new_password:
			instance.set_password(new_password)
			instance.must_change_password = False
			instance.save(update_fields=["password", "must_change_password"])
			
		if classrooms is not None and instance.is_role(Role.ROLE_TEACHER):
			from apps.classes.models import SchoolClass, TeacherClassroom, Student
			
			current_classroom_ids = set(
				TeacherClassroom.objects.filter(teacher=instance, is_active=True).values_list("classroom_id", flat=True)
			)
			new_classroom_ids = set(int(cid) for cid in classrooms if str(cid).isdigit())
			removed_classroom_ids = current_classroom_ids - new_classroom_ids
			
			for r_id in removed_classroom_ids:
				if Student.objects.filter(registered_by=instance, class_room_id=r_id).exists():
					sc = SchoolClass.objects.filter(id=r_id).first()
					c_name = sc.name if sc else "this class"
					raise serializers.ValidationError(
						f"Class '{c_name}' cannot be removed because students are currently assigned to it. Reassign those students first."
					)
			
			TeacherClassroom.objects.filter(teacher=instance).update(is_active=False)
			for class_id in classrooms:
				try:
					school_class = SchoolClass.objects.get(id=class_id)
					tc, created = TeacherClassroom.objects.get_or_create(teacher=instance, classroom=school_class)
					tc.is_active = True
					tc.save()
				except SchoolClass.DoesNotExist:
					pass
				
		return instance


class RegisterSerializer(UserCreateSerializer):
	pass


class LoginSerializer(serializers.Serializer):
	username = serializers.CharField()
	password = serializers.CharField(write_only=True)

	def validate(self, attrs):
		username = (attrs.get("username") or "").strip()
		password = attrs.get("password")
		request = self.context.get("request")

		user = authenticate(request=request, username=username, password=password)
		if not user:
			user_by_email = User.objects.filter(email__iexact=username).first()
			if user_by_email:
				user = authenticate(
					request=request,
					username=user_by_email.username,
					password=password,
				)

		if not user:
			raise serializers.ValidationError("Invalid credentials.")

		attrs["user"] = user
		return attrs

class NotificationSerializer(serializers.ModelSerializer):
	class Meta:
		model = Notification
		fields = "__all__"
		read_only_fields = ["user", "created_at"]


from .models import SystemAccessLog
class SystemAccessLogSerializer(serializers.ModelSerializer):
	user_name = serializers.SerializerMethodField()
	class Meta:
		model = SystemAccessLog
		fields = ["id", "user_name", "action", "ip_address", "status", "timestamp"]
		
	def get_user_name(self, obj):
		if obj.user:
			return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
		return "System"

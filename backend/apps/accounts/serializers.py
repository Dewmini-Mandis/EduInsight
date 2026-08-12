from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Role, User, Notification

from apps.classes.models import Student, TeacherProfile
from apps.schools.models import School

from .models import Role, User


class RoleSerializer(serializers.ModelSerializer):
	class Meta:
		model = Role
		fields = ["id", "role_name"]


class UserSerializer(serializers.ModelSerializer):
	role = serializers.SlugRelatedField(read_only=True, slug_field="role_name")
	school_id = serializers.PrimaryKeyRelatedField(source="school", read_only=True)
	school_name = serializers.CharField(source="school.name", read_only=True)
	full_name = serializers.SerializerMethodField()
	student_profile = serializers.SerializerMethodField()
	teacher_profile = serializers.SerializerMethodField()

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
			"student_profile",
			"teacher_profile",
			"is_active",
		]

	def get_full_name(self, obj: User) -> str:
		return f"{obj.first_name} {obj.last_name}".strip()

	def get_student_profile(self, obj: User):
		if not hasattr(obj, "student_profile"):
			return None
		profile = obj.student_profile
		return {
			"index_no": profile.index_no,
			"grade": profile.grade,
			"class_name": profile.class_name,
			"class_room": {"id": profile.class_room.id, "name": profile.class_room.name} if profile.class_room else None,
		}

	def get_teacher_profile(self, obj: User):
		if not hasattr(obj, "teacher_profile"):
			return None
		profile = obj.teacher_profile
		return {
			"subjects": profile.subjects,
			"classrooms": [{"id": c.classroom.id, "name": c.classroom.name} for c in obj.teacherclassroom_set.filter(is_active=True).select_related("classroom")],
		}


class UserCreateSerializer(serializers.ModelSerializer):
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
	subjects = serializers.ListField(
		child=serializers.CharField(), write_only=True, required=False
	)
	classrooms = serializers.ListField(
		child=serializers.IntegerField(), write_only=True, required=False
	)

	class Meta:
		model = User
		fields = [
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
			"subjects",
		"classrooms",
		]

	def create(self, validated_data):
		role = validated_data.get("role")
		if role and role.role_name != Role.ROLE_STUDENT:
			validated_data["username"] = validated_data.get("email")
		password = validated_data.pop("password")
		index_no = validated_data.pop("index_no", "")
		grade = validated_data.pop("grade", "")
		class_name = validated_data.pop("class_name", "")
		class_room_id = validated_data.pop("class_room_id", None)
		subjects = validated_data.pop("subjects", [])
		user = User.objects.create_user(password=password, **validated_data)
		if role and role.role_name == Role.ROLE_STUDENT:
			student = Student.objects.create(
				user=user,
				index_no=index_no,
				grade=grade,
				class_name=class_name,
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
			TeacherProfile.objects.create(user=user, subjects=subjects or [])
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
	subjects = serializers.ListField(
		child=serializers.CharField(), write_only=True, required=False
	)
	classrooms = serializers.ListField(
		child=serializers.IntegerField(), write_only=True, required=False
	)
	password = serializers.CharField(write_only=True, required=False, min_length=8)

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
			"subjects",
		"classrooms",
		]

	def update(self, instance, validated_data):
		index_no = validated_data.pop("index_no", None)
		grade = validated_data.pop("grade", None)
		class_name = validated_data.pop("class_name", None)
		class_room_id = validated_data.pop("class_room_id", None)
		subjects = validated_data.pop("subjects", None)
		classrooms = validated_data.pop("classrooms", None)
		password = validated_data.pop("password", None)
		role = validated_data.get("role") or instance.role

		instance = super().update(instance, validated_data)

		if password:
			instance.set_password(password)
			instance.save(update_fields=["password"])

		if role and role.role_name == Role.ROLE_STUDENT:
			student, _ = Student.objects.get_or_create(user=instance)
			if index_no is not None:
				student.index_no = index_no
			if grade is not None:
				student.grade = grade
			if class_name is not None:
				student.class_name = class_name
			if class_room_id is not None:
				from apps.classes.models import SchoolClass
				try:
					student.class_room = SchoolClass.objects.get(id=class_room_id)
				except SchoolClass.DoesNotExist:
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
				for class_id in classrooms:
					try:
						sc = SchoolClass.objects.get(id=class_id)
						tc, _ = TeacherClassroom.objects.get_or_create(teacher=instance, classroom=sc)
						tc.is_active = True
						tc.save()
					except SchoolClass.DoesNotExist:
						pass
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
		fields = ["first_name", "last_name", "current_password", "new_password", "classrooms"]

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
			instance.save(update_fields=["password"])
			
		if classrooms is not None and instance.is_role(Role.ROLE_TEACHER):
			from apps.classes.models import SchoolClass, TeacherClassroom
			
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
		username = attrs.get("username")
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

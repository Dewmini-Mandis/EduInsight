from django.contrib.auth import authenticate
from rest_framework import serializers

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
		}

	def get_teacher_profile(self, obj: User):
		if not hasattr(obj, "teacher_profile"):
			return None
		profile = obj.teacher_profile
		return {
			"subjects": profile.subjects,
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
	class_name = serializers.CharField(
		write_only=True, required=False, allow_blank=True
	)
	subjects = serializers.ListField(
		child=serializers.CharField(), write_only=True, required=False
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
			"subjects",
		]

	def create(self, validated_data):
		role = validated_data.get("role")
		if role and role.role_name != Role.ROLE_STUDENT:
			validated_data["username"] = validated_data.get("email")
		password = validated_data.pop("password")
		index_no = validated_data.pop("index_no", "")
		grade = validated_data.pop("grade", "")
		class_name = validated_data.pop("class_name", "")
		subjects = validated_data.pop("subjects", [])
		user = User.objects.create_user(password=password, **validated_data)
		if role and role.role_name == Role.ROLE_STUDENT:
			Student.objects.create(
				user=user,
				index_no=index_no,
				grade=grade,
				class_name=class_name,
			)
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
	class_name = serializers.CharField(
		write_only=True, required=False, allow_blank=True
	)
	subjects = serializers.ListField(
		child=serializers.CharField(), write_only=True, required=False
	)

	class Meta:
		model = User
		fields = [
			"first_name",
			"last_name",
			"role",
			"school_id",
			"is_active",
			"index_no",
			"grade",
			"class_name",
			"subjects",
		]

	def update(self, instance, validated_data):
		index_no = validated_data.pop("index_no", None)
		grade = validated_data.pop("grade", None)
		class_name = validated_data.pop("class_name", None)
		subjects = validated_data.pop("subjects", None)
		role = validated_data.get("role") or instance.role

		instance = super().update(instance, validated_data)

		if role and role.role_name == Role.ROLE_STUDENT:
			student, _ = Student.objects.get_or_create(user=instance)
			if index_no is not None:
				student.index_no = index_no
			if grade is not None:
				student.grade = grade
			if class_name is not None:
				student.class_name = class_name
			student.save()
		elif role and role.role_name == Role.ROLE_TEACHER:
			teacher, _ = TeacherProfile.objects.get_or_create(user=instance)
			if subjects is not None:
				teacher.subjects = subjects
				teacher.save()

		instance.refresh_from_db()
		return instance

	def to_representation(self, instance):
		return UserSerializer(instance, context=self.context).data


class ProfileUpdateSerializer(serializers.ModelSerializer):
	new_password = serializers.CharField(write_only=True, required=False)

	class Meta:
		model = User
		fields = ["first_name", "last_name", "new_password"]

	def update(self, instance, validated_data):
		new_password = validated_data.pop("new_password", None)
		instance = super().update(instance, validated_data)
		if new_password:
			instance.set_password(new_password)
			instance.save(update_fields=["password"])
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

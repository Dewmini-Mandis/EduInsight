from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = [
			"id",
			"username",
			"email",
			"first_name",
			"last_name",
			"role",
			"school_id",
		]


class RegisterSerializer(serializers.ModelSerializer):
	password = serializers.CharField(write_only=True)

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
		]

	def create(self, validated_data):
		password = validated_data.pop("password")
		user = User.objects.create_user(password=password, **validated_data)
		return user


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

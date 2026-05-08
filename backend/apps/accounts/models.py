from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
	ROLE_NATIONAL_ADMIN = "NATIONAL_ADMIN"
	ROLE_SCHOOL_ADMIN = "SCHOOL_ADMIN"
	ROLE_TEACHER = "TEACHER"
	ROLE_STUDENT = "STUDENT"
	ROLE_SYSTEM_ADMIN = "SYSTEM_ADMIN"

	ROLE_CHOICES = [
		(ROLE_NATIONAL_ADMIN, "National Admin"),
		(ROLE_SCHOOL_ADMIN, "School Admin"),
		(ROLE_TEACHER, "Teacher"),
		(ROLE_STUDENT, "Student"),
		(ROLE_SYSTEM_ADMIN, "System Admin"),
	]

	role_name = models.CharField(max_length=32, choices=ROLE_CHOICES, unique=True)

	def __str__(self) -> str:
		return self.role_name


class User(AbstractUser):
	role = models.ForeignKey(
		Role,
		on_delete=models.PROTECT,
		related_name="users",
		null=True,
		blank=True,
	)
	school = models.ForeignKey(
		"schools.School",
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name="users",
	)

	def is_role(self, *roles: str) -> bool:
		return bool(self.role) and self.role.role_name in roles

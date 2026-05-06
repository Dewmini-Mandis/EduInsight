from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
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

	role = models.CharField(
		max_length=32,
		choices=ROLE_CHOICES,
		default=ROLE_STUDENT,
	)
	school_id = models.PositiveIntegerField(null=True, blank=True)

	def is_role(self, *roles: str) -> bool:
		return self.role in roles

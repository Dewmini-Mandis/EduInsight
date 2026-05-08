from django.db import models


class SchoolClass(models.Model):
	name = models.CharField(max_length=120)
	school = models.ForeignKey(
		"schools.School",
		on_delete=models.CASCADE,
		related_name="classes",
	)
	teacher = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="classes",
	)

	class Meta:
		db_table = "classes"
		unique_together = ("name", "school")

	def __str__(self) -> str:
		return f"{self.name} ({self.school.name})"


class Student(models.Model):
	user = models.OneToOneField(
		"accounts.User",
		on_delete=models.CASCADE,
		related_name="student_profile",
	)
	index_no = models.CharField(max_length=50, blank=True)
	grade = models.CharField(max_length=20, blank=True)
	class_name = models.CharField(max_length=50, blank=True)
	class_room = models.ForeignKey(
		SchoolClass,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="students",
	)

	class Meta:
		db_table = "students"

	def __str__(self) -> str:
		return self.user.get_full_name() or self.user.username


class TeacherProfile(models.Model):
	user = models.OneToOneField(
		"accounts.User",
		on_delete=models.CASCADE,
		related_name="teacher_profile",
	)
	subjects = models.JSONField(default=list, blank=True)

	def __str__(self) -> str:
		return self.user.get_full_name() or self.user.username

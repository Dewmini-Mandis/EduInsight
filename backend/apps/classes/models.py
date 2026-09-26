from django.db import models


class SchoolClass(models.Model):
	name = models.CharField(max_length=120)
	school = models.ForeignKey(
		"schools.School",
		on_delete=models.CASCADE,
		related_name="classes",
	)
	is_active = models.BooleanField(default=True)
	teachers = models.ManyToManyField(
		"accounts.User",
		through="TeacherClassroom",
		related_name="assigned_classes",
	)

	class Meta:
		db_table = "classes"
		unique_together = ("name", "school")

	def __str__(self) -> str:
		return f"{self.name} ({self.school.name})"

class TeacherClassroom(models.Model):
	teacher = models.ForeignKey("accounts.User", on_delete=models.CASCADE)
	classroom = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
	is_active = models.BooleanField(default=True)
	assigned_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ("teacher", "classroom")



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
	registered_by = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="registered_students",
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
	teacher_id = models.CharField(max_length=50, blank=True, default="")
	subjects = models.JSONField(default=list, blank=True)

	def __str__(self) -> str:
		return self.user.get_full_name() or self.user.username


class ClassroomAccessRequest(models.Model):
	STATUS_CHOICES = (
		('PENDING', 'Pending'),
		('APPROVED', 'Approved'),
		('REJECTED', 'Rejected'),
	)
	teacher = models.ForeignKey(
		"accounts.User",
		on_delete=models.CASCADE,
		related_name="classroom_requests"
	)
	classroom = models.ForeignKey(
		SchoolClass,
		on_delete=models.CASCADE,
		related_name="access_requests"
	)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
	requested_at = models.DateTimeField(auto_now_add=True)
	resolved_at = models.DateTimeField(null=True, blank=True)
	resolved_by = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="resolved_requests"
	)

	class Meta:
		unique_together = ("teacher", "classroom", "status")

	def __str__(self) -> str:
		return f"Request for {self.classroom.name} by {self.teacher.username} ({self.status})"

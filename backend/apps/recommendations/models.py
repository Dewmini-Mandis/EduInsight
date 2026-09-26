from django.db import models


class Recommendation(models.Model):
	student = models.ForeignKey(
		"classes.Student",
		on_delete=models.CASCADE,
		related_name="recommendations",
	)
	topic = models.CharField(max_length=255)
	recommended_activity = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return f"{self.topic}"


class Remediation(models.Model):
	STATUS_REQUIRED = "REQUIRED"
	STATUS_IN_PROGRESS = "IN_PROGRESS"
	STATUS_COMPLETED = "COMPLETED"
	
	STATUS_CHOICES = [
		(STATUS_REQUIRED, "Required"),
		(STATUS_IN_PROGRESS, "In Progress"),
		(STATUS_COMPLETED, "Completed"),
	]

	student = models.ForeignKey("classes.Student", on_delete=models.CASCADE, related_name="remediations")
	skill = models.ForeignKey("quizzes.Skill", on_delete=models.CASCADE, related_name="remediations")
	material = models.ForeignKey("quizzes.LearningMaterial", on_delete=models.CASCADE, related_name="remediations")
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_REQUIRED)
	assigned_at = models.DateTimeField(auto_now_add=True)
	completed_at = models.DateTimeField(null=True, blank=True)

	def __str__(self) -> str:
		return f"Remediation for {self.student.user.username} on {self.skill.name}"

from django.db import models


class Analytics(models.Model):
	student = models.OneToOneField(
		"classes.Student",
		on_delete=models.CASCADE,
		related_name="analytics",
	)
	avg_score = models.FloatField(null=True, blank=True)
	avg_attempts = models.FloatField(null=True, blank=True)
	avg_response_time = models.FloatField(null=True, blank=True)
	risk_level = models.CharField(max_length=30, blank=True)
	cluster_group = models.CharField(max_length=50, blank=True)

	def __str__(self) -> str:
		return f"Analytics for {self.student_id}"

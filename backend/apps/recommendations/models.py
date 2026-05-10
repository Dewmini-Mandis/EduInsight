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

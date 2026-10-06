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

class RiskPrediction(models.Model):
	student = models.ForeignKey("classes.Student", on_delete=models.CASCADE, related_name="risk_predictions")
	attempt = models.ForeignKey("attempts.QuizAttempt", on_delete=models.CASCADE, null=True, blank=True, related_name="risk_predictions")
	skill = models.ForeignKey("quizzes.Skill", on_delete=models.SET_NULL, null=True, blank=True, related_name="risk_predictions")
	risk_category = models.CharField(max_length=50, default="Insufficient Data") 
	confidence_score = models.FloatField(null=True, blank=True)
	risk_probability = models.FloatField(null=True, blank=True)
	threshold = models.FloatField(default=0.50)
	model_version = models.CharField(max_length=100, blank=True)
	contributing_factors = models.JSONField(default=dict)
	explanation_factors = models.JSONField(default=dict, blank=True)
	shap_base_value = models.FloatField(null=True, blank=True)
	explanation_method = models.CharField(max_length=50, default="SHAP", blank=True)
	explainer_version = models.CharField(max_length=100, blank=True)
	prediction_date = models.DateTimeField(auto_now_add=True)
	is_flagged = models.BooleanField(default=False)
	flag_reason = models.TextField(blank=True)
	class Meta:
		indexes = [
			models.Index(fields=["student", "-prediction_date"], name="idx_risk_student_date"),
		]

	def __str__(self):
		return f"{self.student} - {self.risk_category}"
		
class ProficiencyPrediction(models.Model):
	student = models.ForeignKey("classes.Student", on_delete=models.CASCADE, related_name="proficiency_predictions")
	proficiency_level = models.CharField(max_length=50, default="Developing")
	confidence_score = models.FloatField(null=True, blank=True)
	contributing_factors = models.JSONField(default=dict)
	prediction_date = models.DateTimeField(auto_now_add=True)
	is_flagged = models.BooleanField(default=False)
	flag_reason = models.TextField(blank=True)

	def __str__(self):
		return f"{self.student} - {self.proficiency_level}"

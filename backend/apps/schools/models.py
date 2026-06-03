from django.db import models


class School(models.Model):
	name = models.CharField(max_length=255)
	location = models.CharField(max_length=255)
	address = models.CharField(max_length=255, default="", blank=True)
	province = models.CharField(max_length=100, default="", blank=True)
	district = models.CharField(max_length=100, default="", blank=True)
	zone = models.CharField(max_length=100, default="", blank=True)
	educational_zone = models.CharField(max_length=100, default="", blank=True)
	created_by = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		related_name="schools_created",
	)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["name"]

	def __str__(self) -> str:
		return self.name

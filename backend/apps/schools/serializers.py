from rest_framework import serializers

from .models import School


class SchoolSerializer(serializers.ModelSerializer):
	class Meta:
		model = School
		fields = ["id", "name", "location", "created_by", "created_at"]
		read_only_fields = ["created_by", "created_at"]

from rest_framework import serializers

from .models import School


class SchoolSerializer(serializers.ModelSerializer):
	class Meta:
		model = School
		fields = [
			"id", "name", "location", "address", "province",
			"district", "zone", "educational_zone", "created_by", "created_at"
		]
		read_only_fields = ["created_by", "created_at"]
		extra_kwargs = {
			"province": {"required": True, "allow_blank": False},
			"district": {"required": True, "allow_blank": False},
		}

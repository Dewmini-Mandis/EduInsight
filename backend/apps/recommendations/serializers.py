from rest_framework import serializers
from apps.classes.models import Student
from .models import Recommendation

class RecommendationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_email = serializers.CharField(source="student.user.email", read_only=True)
    student_index = serializers.CharField(source="student.index_no", read_only=True)
    class_name = serializers.CharField(source="student.class_name", read_only=True)

    class Meta:
        model = Recommendation
        fields = [
            "id",
            "student",
            "student_name",
            "student_email",
            "student_index",
            "class_name",
            "topic",
            "recommended_activity",
            "created_at",
        ]

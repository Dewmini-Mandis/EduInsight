from rest_framework import serializers
from apps.classes.models import Student
from .models import Recommendation, Remediation

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


class RemediationSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)
    material_title = serializers.CharField(source="material.title", read_only=True)
    material_type = serializers.CharField(source="material.material_type", read_only=True)
    lesson_id = serializers.IntegerField(source="material.lesson_id", read_only=True)
    lesson_title = serializers.CharField(source="material.lesson.title", read_only=True)

    class Meta:
        model = Remediation
        fields = [
            "id",
            "student",
            "skill",
            "skill_name",
            "material",
            "material_title",
            "material_type",
            "lesson_id",
            "lesson_title",
            "status",
            "assigned_at",
            "completed_at",
        ]

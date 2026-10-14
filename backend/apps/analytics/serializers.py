from rest_framework import serializers
from .models import Analytics, RiskPrediction, ProficiencyPrediction

class AnalyticsSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    
    class Meta:
        model = Analytics
        fields = "__all__"

class RiskPredictionSerializer(serializers.ModelSerializer):
    student_id = serializers.IntegerField(read_only=True)
    student_user_id = serializers.IntegerField(source="student.user_id", read_only=True)
    student_username = serializers.CharField(source="student.user.username", read_only=True)
    student_name = serializers.SerializerMethodField()
    student_class = serializers.CharField(source="student.class_name", read_only=True)
    skill_name = serializers.CharField(source="skill.name", read_only=True)
    
    class Meta:
        model = RiskPrediction
        fields = "__all__"

    def get_student_name(self, obj):
        name = obj.student.user.get_full_name()
        return name if name else obj.student.user.username

class ProficiencyPredictionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    
    class Meta:
        model = ProficiencyPrediction
        fields = "__all__"

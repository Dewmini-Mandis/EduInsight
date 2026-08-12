from rest_framework import serializers
from .models import Analytics, RiskPrediction, ProficiencyPrediction

class AnalyticsSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    
    class Meta:
        model = Analytics
        fields = "__all__"

class RiskPredictionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    
    class Meta:
        model = RiskPrediction
        fields = "__all__"

class ProficiencyPredictionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    
    class Meta:
        model = ProficiencyPrediction
        fields = "__all__"

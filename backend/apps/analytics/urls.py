from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalyticsViewSet, RiskPredictionViewSet, ProficiencyPredictionViewSet, StudentSkillRiskPredictionView

router = DefaultRouter()
router.register(r'overview', AnalyticsViewSet, basename='analytics-overview')
router.register(r'risk', RiskPredictionViewSet, basename='risk-prediction')
router.register(r'proficiency', ProficiencyPredictionViewSet, basename='proficiency-prediction')

urlpatterns = [
    path('students/<int:student_id>/skills/<int:skill_id>/risk/', StudentSkillRiskPredictionView.as_view(), name='student_skill_risk'),
    path('', include(router.urls)),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalyticsViewSet, RiskPredictionViewSet, ProficiencyPredictionViewSet

router = DefaultRouter()
router.register(r'overview', AnalyticsViewSet, basename='analytics-overview')
router.register(r'risk', RiskPredictionViewSet, basename='risk-prediction')
router.register(r'proficiency', ProficiencyPredictionViewSet, basename='proficiency-prediction')

urlpatterns = [
    path('', include(router.urls)),
]

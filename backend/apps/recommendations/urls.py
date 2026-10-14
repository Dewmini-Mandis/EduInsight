from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import RecommendationViewSet, RemediationViewSet

router = DefaultRouter()
router.register("remediations", RemediationViewSet, basename="remediation")
router.register("", RecommendationViewSet, basename="recommendation")

urlpatterns = [
    path("", include(router.urls)),
]

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LoginView, LogoutView, MeView, UserViewSet, NotificationViewSet
from apps.audit.views import AuditLogViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("activities", AuditLogViewSet, basename="activities")
router.register("access-logs", AuditLogViewSet, basename="access-logs")

urlpatterns = [
	path("login/", LoginView.as_view(), name="login"),
	path("logout/", LogoutView.as_view(), name="logout"),
	path("me/", MeView.as_view(), name="me"),
	path("", include(router.urls)),
]

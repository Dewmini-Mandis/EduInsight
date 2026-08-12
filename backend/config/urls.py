from django.contrib import admin
from django.urls import include, path

urlpatterns = [
	path("admin/", admin.site.urls),
	path("api/accounts/", include("apps.accounts.urls")),
	path("api/schools/", include("apps.schools.urls")),
	path("api/classes/", include("apps.classes.urls")),
	path("api/quizzes/", include("apps.quizzes.urls")),
	path("api/attempts/", include("apps.attempts.urls")),
	path("api/analytics/", include("apps.analytics.urls")),
	path("api/recommendations/", include("apps.recommendations.urls")),
]

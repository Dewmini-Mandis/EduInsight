import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS.append("testserver")

from apps.accounts.models import User, Role
from rest_framework.test import APIClient

admin_user = User.objects.filter(role__role_name=Role.ROLE_SYSTEM_ADMIN).first()
if not admin_user:
    admin_user = User.objects.filter(is_superuser=True).first()

client = APIClient()
client.force_authenticate(user=admin_user)

res = client.get("/api/accounts/users/stats/")
print(f"GET /api/accounts/users/stats/ status: {res.status_code}, data: {res.json()}")

import os, sys, django
sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import User, Role
from apps.analytics.views import ProficiencyPredictionViewSet
from django.test import RequestFactory
from rest_framework.test import force_authenticate
import time
from django.db import connection, reset_queries

teacher_user = User.objects.filter(role__role_name=Role.ROLE_TEACHER).first()
factory = RequestFactory()
request = factory.get('/api/analytics/proficiency/', HTTP_HOST='localhost')
force_authenticate(request, user=teacher_user)
reset_queries()
t0 = time.perf_counter()
resp = ProficiencyPredictionViewSet.as_view({'get': 'list'})(request)
total = (time.perf_counter() - t0) * 1000
print(f"Status: {resp.status_code}")
print(f"Total time ms: {total:.2f}")
queries = list(connection.queries)
print(f"Query count: {len(queries)}")
for i, q in enumerate(queries):
    tm = float(q.get('time', 0)) * 1000.0
    print(f"Q{i+1} [{tm:.1f}ms]: {q['sql']}")

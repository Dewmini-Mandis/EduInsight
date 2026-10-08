import os, sys, django
sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import User, Role
from apps.quizzes.models import Lesson
from apps.quizzes.views import LessonViewSet
from django.test import RequestFactory
from rest_framework.test import force_authenticate
import time
from django.db import connection, reset_queries

student_user = User.objects.filter(role__role_name=Role.ROLE_STUDENT).first()
lesson = Lesson.objects.first()
factory = RequestFactory()

req = factory.get(f"/api/quizzes/lessons/{lesson.id}/student_quizzes/", HTTP_HOST='localhost')
force_authenticate(req, user=student_user)

reset_queries()
t0 = time.perf_counter()
resp = LessonViewSet.as_view({'get': 'student_quizzes'})(req, pk=lesson.id)
if hasattr(resp, 'render'):
    resp.render()
t_total = (time.perf_counter() - t0) * 1000

queries = list(connection.queries)
print(f"OPTIMIZED STUDENT LESSON QUIZZES: Status: {resp.status_code}, Time: {t_total:.1f}ms, Query count: {len(queries)}, Payload size: {len(resp.content)} bytes")
for i, q in enumerate(queries):
    tm = float(q.get("time", 0)) * 1000.0
    print(f"Q{i+1} [{tm:.1f}ms]: {q['sql'][:160]}")

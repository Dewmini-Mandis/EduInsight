import os, sys, django
sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import User, Role
from apps.quizzes.models import Quiz
from apps.attempts.views import QuizAttemptViewSet
from django.test import RequestFactory
from rest_framework.test import force_authenticate
import time
from django.db import connection, reset_queries

student_user = User.objects.filter(role__role_name=Role.ROLE_STUDENT).first()
sample_quiz = Quiz.objects.filter(is_deleted=False).first()
factory = RequestFactory()

print(f"Testing student {student_user.username} on quiz {sample_quiz.id} ({sample_quiz.title})")

# 1. Test remediation_status
req1 = factory.get(f"/api/attempts/attempts/remediation_status/?quiz={sample_quiz.id}", HTTP_HOST='localhost')
force_authenticate(req1, user=student_user)
reset_queries()
t0 = time.perf_counter()
resp1 = QuizAttemptViewSet.as_view({'get': 'remediation_status'})(req1)
if hasattr(resp1, 'render'):
    resp1.render()
t1 = (time.perf_counter() - t0) * 1000
q1 = list(connection.queries)
print(f"REMEDIATION STATUS: Status: {resp1.status_code}, Time: {t1:.1f}ms, Query count: {len(q1)}, Payload size: {len(resp1.content)} bytes")
for i, q in enumerate(q1):
    tm = float(q.get("time", 0)) * 1000.0
    print(f"  Q{i+1} [{tm:.1f}ms]: {q['sql'][:160]}")

# 2. Test remediation_summary
req2 = factory.get(f"/api/attempts/attempts/remediation_summary/?quiz={sample_quiz.id}", HTTP_HOST='localhost')
force_authenticate(req2, user=student_user)
reset_queries()
t0 = time.perf_counter()
resp2 = QuizAttemptViewSet.as_view({'get': 'remediation_summary'})(req2)
if hasattr(resp2, 'render'):
    resp2.render()
t2 = (time.perf_counter() - t0) * 1000
q2 = list(connection.queries)
print(f"\nREMEDIATION SUMMARY: Status: {resp2.status_code}, Time: {t2:.1f}ms, Query count: {len(q2)}, Payload size: {len(resp2.content)} bytes")
for i, q in enumerate(q2):
    tm = float(q.get("time", 0)) * 1000.0
    print(f"  Q{i+1} [{tm:.1f}ms]: {q['sql'][:160]}")

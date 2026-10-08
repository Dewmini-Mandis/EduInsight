import os
import sys
import time
import json
import django

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection, reset_queries
from django.test import RequestFactory
from rest_framework.test import force_authenticate
from apps.accounts.models import User, Role
from apps.quizzes.models import Lesson, Quiz
from apps.attempts.models import QuizAttempt
from apps.quizzes.views import QuizViewSet, LessonViewSet
from apps.attempts.views import QuizAttemptViewSet
from apps.analytics.views import AnalyticsViewSet, RiskPredictionViewSet, ProficiencyPredictionViewSet

factory = RequestFactory()

connection.ensure_connection()

student_user = User.objects.filter(role__role_name=Role.ROLE_STUDENT).first()
teacher_user = User.objects.filter(role__role_name=Role.ROLE_TEACHER).first()
sample_quiz = Quiz.objects.filter(is_deleted=False).first()
sample_attempt = QuizAttempt.objects.first()

print(f"Student: {student_user.username} (ID: {student_user.id})")
print(f"Teacher: {teacher_user.username} (ID: {teacher_user.id})")
print(f"Sample Quiz ID: {sample_quiz.id if sample_quiz else None}")
print(f"Sample Attempt ID: {sample_attempt.id if sample_attempt else None}")

def inspect_endpoint(name, view_set, action, method="GET", url="/", query_params=None, user=None, pk=None):
    print("\n" + "="*80)
    print(f"INSPECTING: {name}")
    print("="*80)
    
    if query_params:
        from urllib.parse import urlencode
        url = f"{url}?{urlencode(query_params)}"
        
    request = factory.get(url, HTTP_HOST="localhost")
    if user:
        force_authenticate(request, user=user)
        
    reset_queries()
    t0 = time.perf_counter()
    
    view = view_set.as_view({method.lower(): action})
    if pk is not None:
        resp = view(request, pk=pk)
    else:
        resp = view(request)
        
    total_time = (time.perf_counter() - t0) * 1000.0
    queries = list(connection.queries)
    db_time = sum(float(q.get("time", 0)) for q in queries) * 1000.0
    
    if hasattr(resp, "render"):
        resp.render()
    payload_size = len(resp.content) if hasattr(resp, "content") else 0
    
    print(f"Status: {resp.status_code}")
    print(f"Total Time: {total_time:.2f} ms")
    print(f"DB Time: {db_time:.2f} ms (in queries)")
    print(f"Python/Serializer Time: {total_time - db_time:.2f} ms")
    print(f"Query Count: {len(queries)}")
    print(f"Payload Size: {payload_size} bytes")
    
    for i, q in enumerate(queries):
        sql = q["sql"]
        q_time = float(q["time"]) * 1000.0
        # truncate sql if long
        truncated_sql = sql[:150] + "..." if len(sql) > 150 else sql
        print(f"  Q{i+1} [{q_time:.1f}ms]: {truncated_sql}")

# 1. Student Quiz List
inspect_endpoint("1. Student Quiz List (GET /api/quizzes/)", QuizViewSet, "list", url="/api/quizzes/", user=student_user)

# 2. Teacher Analytics Proficiency
inspect_endpoint("2. Teacher Analytics Proficiency (GET /api/analytics/proficiency/)", ProficiencyPredictionViewSet, "list", url="/api/analytics/proficiency/", user=teacher_user)

# 3. Remediation Summary
if sample_quiz:
    inspect_endpoint("3. Remediation Summary (GET /api/attempts/attempts/remediation_summary/)", QuizAttemptViewSet, "remediation_summary", url="/api/attempts/attempts/remediation_summary/", query_params={"quiz": sample_quiz.id}, user=student_user)

# 4. Attempt Detail
if sample_attempt:
    inspect_endpoint("4. Attempt Detail (GET /api/attempts/attempts/:id/)", QuizAttemptViewSet, "retrieve", url=f"/api/attempts/attempts/{sample_attempt.id}/", user=student_user, pk=sample_attempt.id)

# 5. Remediation Status
if sample_quiz:
    inspect_endpoint("5. Remediation Status (GET /api/attempts/attempts/remediation_status/)", QuizAttemptViewSet, "remediation_status", url="/api/attempts/attempts/remediation_status/", query_params={"quiz": sample_quiz.id}, user=student_user)

# 6. Student Lesson Quizzes
sample_lesson = Lesson.objects.first()
if sample_lesson:
    inspect_endpoint("6. Student Lesson Quizzes (GET /api/quizzes/lessons/:id/student_quizzes/)", LessonViewSet, "student_quizzes", url=f"/api/quizzes/lessons/{sample_lesson.id}/student_quizzes/", user=student_user, pk=sample_lesson.id)

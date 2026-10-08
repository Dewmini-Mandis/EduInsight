import os, sys, django
sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import User, Role
from apps.attempts.models import QuizAttempt
from apps.attempts.views import QuizAttemptViewSet
from django.test import RequestFactory
from rest_framework.test import force_authenticate
import time
from django.db import connection, reset_queries

student_user = User.objects.filter(role__role_name=Role.ROLE_STUDENT).first()
attempt = QuizAttempt.objects.filter(student__user=student_user).first()
if not attempt:
    attempt = QuizAttempt.objects.first()
    student_user = attempt.student.user

print(f"Testing attempt ID {attempt.id} for user {student_user.username}")

factory = RequestFactory()
request = factory.get(f"/api/attempts/attempts/{attempt.id}/", HTTP_HOST='localhost')
force_authenticate(request, user=student_user)

from django.db.models import Prefetch
from apps.attempts.models import AttemptQuestion, AttemptAnswer
from apps.attempts.serializers import QuizAttemptSerializer

custom_qs = QuizAttempt.objects.select_related(
    "quiz", "quiz__lesson", "quiz__skill", "quiz__lesson__term", "student__user"
).prefetch_related(
    Prefetch(
        "answers",
        queryset=AttemptAnswer.objects.select_related("question", "skill")
    ),
    "risk_predictions",
    Prefetch(
        "attempt_questions",
        queryset=AttemptQuestion.objects.select_related(
            "question",
            "question__skill",
            "question__correct_answer",
        ).prefetch_related(
            "question__answers",
            "question__hints",
        )
    ),
)

reset_queries()
t0 = time.perf_counter()
att = custom_qs.get(id=attempt.id)
data = QuizAttemptSerializer(att, context={"request": request}).data
t_total = (time.perf_counter() - t0) * 1000

queries = list(connection.queries)
print(f"PREFETCH TEST: Time: {t_total:.1f}ms, Query count: {len(queries)}")
for i, q in enumerate(queries):
    tm = float(q.get("time", 0)) * 1000.0
    print(f"Q{i+1} [{tm:.1f}ms]: {q['sql'][:180]}")
sys.exit(0)

import os, sys, django
sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import User, Role
from apps.quizzes.models import Quiz
from apps.attempts.models import QuizAttempt, StudentRemediationState
from django.db import connection, reset_queries

student_user = User.objects.filter(role__role_name=Role.ROLE_STUDENT).first()
student = student_user.student_profile
quiz = Quiz.objects.select_related("lesson", "skill").prefetch_related("skills").get(id=5)

reset_queries()
# Test lightweight logic:
all_quiz_attempts = list(
    QuizAttempt.objects.filter(student=student, quiz=quiz)
    .prefetch_related("risk_predictions")
    .order_by("-start_time")
)

ordinary_attempts = [
    a for a in all_quiz_attempts
    if (a.attempt_type == QuizAttempt.TYPE_ORDINARY or not a.attempt_type) and a.status == QuizAttempt.STATUS_SUBMITTED
]
ordinary_used = len(ordinary_attempts)
max_attempts = quiz.max_attempts or 3
pass_threshold = quiz.pass_mark or 50

has_passed = any(a.score is not None and a.score >= pass_threshold for a in all_quiz_attempts)

rem_state = StudentRemediationState.objects.filter(student=student, quiz=quiz).prefetch_related("weak_skills", "required_materials").first()

print(f"Attempts used: {ordinary_used}/{max_attempts}, Has passed: {has_passed}, Has rem_state: {rem_state is not None}")

queries = list(connection.queries)
print(f"Initial queries so far: {len(queries)}")
for i, q in enumerate(queries):
    print(f"Q{i+1}: {q['sql'][:120]}")

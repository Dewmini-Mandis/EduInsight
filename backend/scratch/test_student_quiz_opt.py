import os, sys, django
sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.accounts.models import User, Role
from apps.quizzes.models import Quiz
from apps.quizzes.serializers import QuizListSerializer
from django.test import RequestFactory
from rest_framework.test import force_authenticate
import time
from django.db import connection, reset_queries, models

student_user = User.objects.filter(role__role_name=Role.ROLE_STUDENT).first()
student_profile = student_user.student_profile
teacher_id = student_profile.registered_by_id
class_id = student_profile.class_room_id

reset_queries()
t0 = time.perf_counter()

qs = Quiz.objects.filter(is_deleted=False).annotate(
    annotated_question_count=models.Count('questions', distinct=True)
).select_related('lesson', 'quiz_level', 'difficulty')

q_filter = models.Q(created_by_id=teacher_id, status='PUBLISHED') & (models.Q(assigned_class_id=class_id) | models.Q(assigned_classes__id=class_id))
qs = qs.filter(q_filter).distinct().order_by('lesson__order', 'quiz_level__order', 'difficulty__order', 'order', 'id')

data = list(qs)
t_db = (time.perf_counter() - t0) * 1000

queries = list(connection.queries)
print(f"Count: {len(data)}, DB Time: {t_db:.1f}ms, Query Count: {len(queries)}")
for i, q in enumerate(queries):
    tm = float(q.get("time", 0)) * 1000.0
    print(f"Q{i+1} [{tm:.1f}ms]: {q['sql'][:180]}")

import os
import sys
import time
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection, reset_queries
from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student
from apps.quizzes.models import AcademicTerm, Lesson, Topic, Skill, QuizLevel, DifficultyLevel, Quiz, Question, Answer, LearningMaterial
from apps.attempts.models import QuizAttempt

def run_measurement():
    admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)
    school, _ = School.objects.get_or_create(name="Perf Measurement School")
    admin_user, _ = User.objects.get_or_create(
        username="perf_measurer",
        defaults={"email": "perf@test.com", "role": admin_role, "school": school, "first_name": "Perf", "last_name": "Test"}
    )

    client = APIClient()
    client.force_authenticate(user=admin_user)

    print("=== BASELINE MEASUREMENT ===")

    # 1. LearningMaterial
    reset_queries()
    start = time.time()
    res1 = client.get("/api/quizzes/materials/")
    dur1 = (time.time() - start) * 1000
    queries1 = len(connection.queries)
    size1 = len(res1.content)
    print(f"LearningMaterial GET /api/quizzes/materials/: Status={res1.status_code}, Time={dur1:.2f}ms, Queries={queries1}, Size={size1} bytes")

    # 2. Quiz List
    reset_queries()
    start = time.time()
    res2 = client.get("/api/quizzes/")
    dur2 = (time.time() - start) * 1000
    queries2 = len(connection.queries)
    size2 = len(res2.content)
    print(f"Quiz GET /api/quizzes/: Status={res2.status_code}, Time={dur2:.2f}ms, Queries={queries2}, Size={size2} bytes")

    # 3. Quiz Attempts
    reset_queries()
    start = time.time()
    res3 = client.get("/api/attempts/attempts/")
    dur3 = (time.time() - start) * 1000
    queries3 = len(connection.queries)
    size3 = len(res3.content)
    print(f"QuizAttempt GET /api/attempts/attempts/: Status={res3.status_code}, Time={dur3:.2f}ms, Queries={queries3}, Size={size3} bytes")

if __name__ == "__main__":
    run_measurement()

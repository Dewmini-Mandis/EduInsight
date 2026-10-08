import os
import sys
import django

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User, Role
from apps.quizzes.models import Lesson, Skill
from rest_framework.test import APIClient

print("=== TESTING BACKEND AUTHORIZATION FOR LESSONS & SKILLS ===")

admin_user = User.objects.filter(role__role_name=Role.ROLE_SYSTEM_ADMIN).first()
teacher_user = User.objects.filter(role__role_name=Role.ROLE_TEACHER).first()
lesson = Lesson.objects.first()

if not lesson:
    print("No lesson found in DB.")
    sys.exit(1)

print(f"Test Lesson ID: {lesson.id}, Title: '{lesson.title}'")

# 1. Test Teacher PATCH Lesson -> expect 403
teacher_client = APIClient()
teacher_client.force_authenticate(user=teacher_user)
resp_teacher_lesson = teacher_client.patch(f"/api/quizzes/lessons/{lesson.id}/", {"title": "Unauthorized Teacher Edit"})
print(f"Teacher PATCH Lesson Response: Status={resp_teacher_lesson.status_code}")
assert resp_teacher_lesson.status_code == 403, f"Expected 403, got {resp_teacher_lesson.status_code}"

# 2. Test Teacher POST Skill -> expect 403
resp_teacher_skill = teacher_client.post("/api/quizzes/skills/", {"name": "Unauthorized Teacher Skill", "lesson": lesson.id})
print(f"Teacher POST Skill Response: Status={resp_teacher_skill.status_code}")
assert resp_teacher_skill.status_code == 403, f"Expected 403, got {resp_teacher_skill.status_code}"

# 3. Test Admin PATCH Lesson -> expect 200
admin_client = APIClient()
admin_client.force_authenticate(user=admin_user)
resp_admin_lesson = admin_client.patch(f"/api/quizzes/lessons/{lesson.id}/", {"description": lesson.description or "Updated description"})
print(f"Admin PATCH Lesson Response: Status={resp_admin_lesson.status_code}")
assert resp_admin_lesson.status_code == 200, f"Expected 200, got {resp_admin_lesson.status_code}"

print("All permission assertions PASSED successfully!")

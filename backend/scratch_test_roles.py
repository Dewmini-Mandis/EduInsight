import os
import sys

sys.path.insert(0, os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS = ['*']

from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.quizzes.models import Lesson, AcademicTerm

role_teacher, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
role_admin, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)

# Setup test users
teacher, _ = User.objects.get_or_create(username='test_teacher_auth', defaults={'email': 'teacher@test.com', 'role': role_teacher})
teacher.role = role_teacher
teacher.save()

sysadmin, _ = User.objects.get_or_create(username='test_sysadmin_auth', defaults={'email': 'sysadmin@test.com', 'role': role_admin})
sysadmin.role = role_admin
sysadmin.save()

term = AcademicTerm.objects.first()
if not term:
    term = AcademicTerm.objects.create(name='Test Term')

client_teacher = APIClient()
client_teacher.force_authenticate(user=teacher)

client_admin = APIClient()
client_admin.force_authenticate(user=sysadmin)

print("--- TESTING TEACHER AUTHORIZATION ---")
# GET Lessons
res_get = client_teacher.get('/api/quizzes/lessons/')
print(f"Teacher GET lessons: {res_get.status_code}")

# POST Lesson
res_post = client_teacher.post('/api/quizzes/lessons/', {'title': 'Test Lesson', 'description': 'Desc', 'term': term.id})
print(f"Teacher POST lesson: {res_post.status_code} (Expected 403)")

print("\n--- TESTING SYSTEM ADMIN AUTHORIZATION ---")
# POST Lesson
res_admin_post = client_admin.post('/api/quizzes/lessons/', {'title': 'Admin Lesson', 'description': 'Desc', 'term': term.id})
print(f"System Admin POST lesson: {res_admin_post.status_code} (Expected 201)")

if res_admin_post.status_code == 201:
    lesson_id = res_admin_post.data['id']
    # PUT Lesson
    res_admin_put = client_admin.put(f'/api/quizzes/lessons/{lesson_id}/', {'title': 'Updated Admin Lesson', 'description': 'Updated Desc', 'term': term.id})
    print(f"System Admin PUT lesson: {res_admin_put.status_code} (Expected 200)")

    # Teacher PUT Lesson
    res_teacher_put = client_teacher.put(f'/api/quizzes/lessons/{lesson_id}/', {'title': 'Hacked Lesson', 'description': 'Hacked Desc', 'term': term.id})
    print(f"Teacher PUT lesson: {res_teacher_put.status_code} (Expected 403)")

    # Teacher DELETE Lesson
    res_teacher_del = client_teacher.delete(f'/api/quizzes/lessons/{lesson_id}/')
    print(f"Teacher DELETE lesson: {res_teacher_del.status_code} (Expected 403)")

    # System Admin DELETE Lesson
    res_admin_del = client_admin.delete(f'/api/quizzes/lessons/{lesson_id}/')
    print(f"System Admin DELETE lesson: {res_admin_del.status_code} (Expected 204)")

print("\nAuthorization checks completed.")

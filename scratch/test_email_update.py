import os
import sys
import django

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User, Role

admin_role = Role.objects.get(role_name=Role.ROLE_SYSTEM_ADMIN)
admin_user = User.objects.filter(role=admin_role).first()

client = APIClient()
client.force_authenticate(user=admin_user)

# 1. Test updating a Teacher's Email
teacher_user = User.objects.filter(role__role_name=Role.ROLE_TEACHER).first()
print("Original Teacher Email:", teacher_user.email)

new_teacher_email = "teacher.email.test@edu.lk"
res_teacher = client.patch(f"/api/accounts/users/{teacher_user.id}/", {"email": new_teacher_email}, format="json")
print("Teacher Email Edit Status:", res_teacher.status_code)
assert res_teacher.status_code == 200, f"Expected 200, got {res_teacher.status_code}"

teacher_user.refresh_from_db()
print("Updated Teacher Email in DB:", teacher_user.email)
assert teacher_user.email == new_teacher_email

# 2. Test updating a Student's Email
student_user = User.objects.filter(role__role_name=Role.ROLE_STUDENT).first()
if not student_user:
    # Create a test student if none exists
    student_role = Role.objects.get(role_name=Role.ROLE_STUDENT)
    student_user = User.objects.create_user(username="temp_student@edu.lk", email="temp_student@edu.lk", password="password123", role=student_role)

print("Original Student Email:", student_user.email)
new_student_email = "student.email.test@edu.lk"
res_student = client.patch(f"/api/accounts/users/{student_user.id}/", {"email": new_student_email}, format="json")
print("Student Email Edit Status:", res_student.status_code)
assert res_student.status_code == 200, f"Expected 200, got {res_student.status_code}"

student_user.refresh_from_db()
print("Updated Student Email in DB:", student_user.email)
assert student_user.email == new_student_email

# 3. Test saving the SAME email (should succeed)
res_same = client.patch(f"/api/accounts/users/{student_user.id}/", {"email": new_student_email}, format="json")
print("Same Email Edit Status:", res_same.status_code)
assert res_same.status_code == 200

# 4. Test duplicate email validation (should return 400)
res_dup = client.patch(f"/api/accounts/users/{student_user.id}/", {"email": new_teacher_email}, format="json")
print("Duplicate Email Edit Status:", res_dup.status_code)
assert res_dup.status_code == 400

print("\n>>> ALL EMAIL UPDATE VERIFICATION TESTS PASSED 100% PERFECTLY! <<<")

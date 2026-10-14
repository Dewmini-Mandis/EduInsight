import os
import sys
import django

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.classes.models import SchoolClass, TeacherClassroom

admin_role = Role.objects.get(role_name=Role.ROLE_SYSTEM_ADMIN)
admin_user = User.objects.filter(role=admin_role).first()

# Cleanup previous test user if exists
User.objects.filter(email="nimal.teacher@edu.lk").delete()

client = APIClient()
client.force_authenticate(user=admin_user)

print("--- TEST 1: CREATE TEACHER WITH 3 CLASSES ---")
create_payload = {
    "first_name": "Nimal",
    "last_name": "Perera",
    "email": "nimal.teacher@edu.lk",
    "password": "password123",
    "is_active": True,
    "role": "TEACHER",
    "classrooms": ["Grade 6A", "Grade 6B", "Grade 7A"],
}

res = client.post("/api/accounts/users/", create_payload, format="json")
print("Create HTTP Status:", res.status_code)
if res.status_code != 201:
    print("Response Data:", res.data)

assert res.status_code == 201, f"Expected 201 Created, got {res.status_code}"

new_teacher_id = res.data["id"]
print("Created Teacher ID:", new_teacher_id)

# Query DB directly to verify
tc_rows = TeacherClassroom.objects.filter(teacher_id=new_teacher_id, is_active=True)
print("DB Active TeacherClassroom Count:", tc_rows.count())
assigned_names = [tc.classroom.name for tc in tc_rows]
print("DB Assigned Class Names:", assigned_names)

assert tc_rows.count() == 3, f"Expected 3 DB rows, got {tc_rows.count()}"
assert set(assigned_names) == {"Grade 6A", "Grade 6B", "Grade 7A"}

print("\n--- TEST 2: GET TEACHER DETAILS (PRE-POPULATION VERIFICATION) ---")
res_get = client.get(f"/api/accounts/users/{new_teacher_id}/")
print("GET HTTP Status:", res_get.status_code)
returned_classrooms = res_get.data.get("teacher_profile", {}).get("classrooms", [])
print("Returned Classrooms in API:", returned_classrooms)
assert len(returned_classrooms) == 3

print("\n--- TEST 3: EDIT TEACHER - REMOVE 1 CLASS, ADD 1 NEW CLASS ---")
edit_payload = {
    "first_name": "Nimal",
    "last_name": "Perera",
    "email": "nimal.teacher@edu.lk",
    "is_active": True,
    "classrooms": ["Grade 6A", "Grade 7A", "Grade 8A"], # Removed 6B, Added 8A
}

res_patch = client.patch(f"/api/accounts/users/{new_teacher_id}/", edit_payload, format="json")
print("PATCH HTTP Status:", res_patch.status_code)

tc_rows_after = TeacherClassroom.objects.filter(teacher_id=new_teacher_id, is_active=True)
assigned_names_after = [tc.classroom.name for tc in tc_rows_after]
print("DB Assigned Class Names After Edit:", assigned_names_after)

assert set(assigned_names_after) == {"Grade 6A", "Grade 7A", "Grade 8A"}

# Inactive count check
inactive_tc = TeacherClassroom.objects.filter(teacher_id=new_teacher_id, is_active=False)
print("Inactive TeacherClassroom count (removed classes):", inactive_tc.count())
assert inactive_tc.count() == 1 # Grade 6B should be inactive

print("\n--- TEST 4: TEACHER SIDE CLASS ACCESS ---")
teacher_user = User.objects.get(id=new_teacher_id)
teacher_client = APIClient()
teacher_client.force_authenticate(user=teacher_user)

res_classes = teacher_client.get("/api/classes/classrooms/")
print("Teacher GET /api/classes/classrooms/ Status:", res_classes.status_code)
teacher_accessible_classes = [c["name"] for c in res_classes.data.get("results", res_classes.data)]
print("Teacher Accessible Classes:", teacher_accessible_classes)

assert set(teacher_accessible_classes) == {"Grade 6A", "Grade 7A", "Grade 8A"}

print("\n>>> ALL 4 VERIFICATION TESTS PASSED 100% PERFECTLY! <<<")

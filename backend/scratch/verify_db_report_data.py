import os
import sys
import django

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_path)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User, Role
from apps.classes.models import SchoolClass, Student, TeacherClassroom

print("=== SCHOOL CLASSES ===")
for sc in SchoolClass.objects.all():
    student_count = sc.students.count()
    teachers = [tc.teacher.username for tc in sc.teacherclassroom_set.filter(is_active=True)]
    print(f"ID: {sc.id} | Name: '{sc.name}' | is_active: {sc.is_active} | Student Count: {student_count} | Teachers: {teachers}")

print("\n=== STUDENTS ===")
for s in Student.objects.select_related("user", "class_room", "registered_by").all():
    c_name = s.class_room.name if s.class_room else None
    c_active = s.class_room.is_active if s.class_room else None
    print(f"Student: {s.user.get_full_name()} ({s.user.username}) | Profile class_name: '{s.class_name}' | class_room: '{c_name}' (is_active={c_active}) | registered_by: {s.registered_by}")

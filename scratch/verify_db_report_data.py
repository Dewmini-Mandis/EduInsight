import os
import sys
import django

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User
from apps.classes.models import SchoolClass, TeacherClassroom, Student
from apps.accounts.serializers import UserSerializer
from apps.classes.serializers import SchoolClassSerializer

print("=== VERIFYING CLASSES (teacher_assigned_only=True filter) ===")
teacher_assigned_classes = SchoolClass.objects.filter(is_active=True, teacherclassroom__is_active=True).distinct()
all_active_classes = SchoolClass.objects.filter(is_active=True)
print(f"Total Active DB classes: {all_active_classes.count()}")
print(f"Teacher-assigned Active classes: {teacher_assigned_classes.count()}")
for c in all_active_classes:
    assigned_teachers = [tc.teacher.get_full_name() for tc in c.teacherclassroom_set.filter(is_active=True)]
    status = f"INCLUDED ({', '.join(assigned_teachers)})" if assigned_teachers else "HIDDEN (No active teacher)"
    print(f"  Class ID={c.id}, Name={c.name} -> {status}")

print("\n=== VERIFYING STUDENTS SERIALIZER (Class + Teacher) ===")
students = User.objects.filter(role__role_name='STUDENT').select_related(
    'student_profile',
    'student_profile__class_room'
).prefetch_related(
    'student_profile__class_room__teacherclassroom_set__teacher'
)

for s in students:
    serializer = UserSerializer(s)
    data = serializer.data
    sp = data.get('student_profile') or {}
    print(f"Student: {s.first_name} {s.last_name} ({s.email})")
    print(f"  class_id: {sp.get('class_id')}")
    print(f"  class_name: '{sp.get('class_name')}'")
    print(f"  assigned_teacher_name: '{sp.get('assigned_teacher_name')}'")
    print(f"  assigned_teacher_email: '{sp.get('assigned_teacher_email')}'")

print("\n=== VERIFYING TEACHER-CLASSROOM ASSIGNMENTS ===")
tc_records = TeacherClassroom.objects.all().select_related('teacher', 'classroom')
for tc in tc_records:
    print(f"TeacherClassroom: Teacher={tc.teacher.first_name} {tc.teacher.last_name}, Class={tc.classroom.name}, is_active={tc.is_active}")

print("\nVerification Complete.")

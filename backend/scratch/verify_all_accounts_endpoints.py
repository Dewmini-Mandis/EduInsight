import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User, Role
from apps.attempts.models import QuizAttempt, StudentLessonProgress, StudentContentProgress, StudentRemediationState, TeacherIntervention
from apps.analytics.models import RiskPrediction
from apps.classes.models import Student

print("=== VERIFYING QUERYSETS FOR ALL ACCOUNTS IN DATABASE ===")

# 1. Teachers Verification
teachers = User.objects.filter(role__role_name=Role.ROLE_TEACHER)
print(f"\n--- TEACHER ACCOUNTS ({teachers.count()}) ---")
for t in teachers:
    st_count = Student.objects.filter(registered_by=t).count()
    att_count = QuizAttempt.objects.filter(student__registered_by=t).count()
    risk_count = RiskPrediction.objects.filter(student__registered_by=t).count()
    interv_count = TeacherIntervention.objects.filter(teacher=t).count() + TeacherIntervention.objects.filter(student__registered_by=t).count()
    print(f"Teacher '{t.username}': {st_count} Students | {att_count} Attempts | {risk_count} Risk Predictions | {interv_count} Interventions -> READY")

# 2. Students Verification
students = User.objects.filter(role__role_name=Role.ROLE_STUDENT)
print(f"\n--- STUDENT ACCOUNTS ({students.count()}) ---")
for su in students:
    st = Student.objects.filter(user=su).first()
    if not st:
        print(f"Student '{su.username}': NO PROFILE RECORD")
        continue
    att_count = QuizAttempt.objects.filter(student=st, quiz__created_by_id=st.registered_by_id, quiz__is_deleted=False).count()
    l_prog = StudentLessonProgress.objects.filter(student=st).count()
    c_prog = StudentContentProgress.objects.filter(student=st).count()
    risk_count = RiskPrediction.objects.filter(student=st).count()
    rem_count = StudentRemediationState.objects.filter(student=st).count()
    print(f"Student '{su.username}' (Reg by {st.registered_by.username if st.registered_by else 'None'}): {att_count} Attempts | {l_prog} Lesson Progress | {c_prog} Content Progress | {risk_count} Risk Preds | {rem_count} Remediation -> READY")

# 3. System Admins Verification
admins = User.objects.filter(role__role_name=Role.ROLE_SYSTEM_ADMIN)
print(f"\n--- SYSTEM ADMIN ACCOUNTS ({admins.count()}) ---")
for a in admins:
    total_att = QuizAttempt.objects.count()
    total_users = User.objects.count()
    print(f"Admin '{a.username}': Sees all {total_users} Users and {total_att} Quiz Attempts -> READY")

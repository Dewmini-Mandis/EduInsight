import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student, TeacherProfile
from apps.quizzes.models import Quiz, Lesson, AcademicTerm, Topic, Skill, LearningMaterial
from apps.attempts.models import QuizAttempt, StudentRemediationState, TeacherIntervention
from apps.analytics.models import RiskPrediction

print("=== DETAILED USER AUDIT ===")
users = User.objects.select_related("role", "school", "student_profile__class_room", "student_profile__registered_by").order_by("id")
for u in users:
    role_str = u.role.role_name if u.role else "None"
    school_str = u.school.name if u.school else "None"
    stu_prof = getattr(u, "student_profile", None)
    classroom_str = stu_prof.class_room.name if stu_prof and stu_prof.class_room else "None"
    reg_by_str = stu_prof.registered_by.username if stu_prof and stu_prof.registered_by else "None"
    print(f"ID={u.id:2d} | Username={u.username:20s} | Role={role_str:13s} | School={school_str:25s} | Class={classroom_str:10s} | RegBy={reg_by_str}")

print("\n=== SCHOOLS ===")
for s in School.objects.all():
    print(f"ID={s.id} | Name={s.name} | Location={s.location}")

print("\n=== CLASSROOMS ===")
for c in SchoolClass.objects.all():
    print(f"ID={c.id} | Name={c.name} | School={c.school.name}")

print("\n=== TERMS, LESSONS, TOPICS, SKILLS ===")
print("Terms:", list(AcademicTerm.objects.values_list('name', flat=True)))
print("Lessons:", list(Lesson.objects.values_list('title', flat=True)))
print("Topics:", list(Topic.objects.values_list('name', flat=True)))
print("Skills:", list(Skill.objects.values_list('name', flat=True)))
print("Materials:", list(LearningMaterial.objects.values_list('title', flat=True)))

print("\n=== QUIZZES ===")
for q in Quiz.objects.select_related('created_by', 'skill').all():
    print(f"ID={q.id} | Title={q.title} | Status={q.status} | Skill={q.skill.name if q.skill else None} | Creator={q.created_by.username if q.created_by else None}")

print("\n=== COUNTS ===")
print("Attempts:", QuizAttempt.objects.count())
print("Risk Predictions:", RiskPrediction.objects.count())
print("Remediation States:", StudentRemediationState.objects.count())
print("Interventions:", TeacherIntervention.objects.count())

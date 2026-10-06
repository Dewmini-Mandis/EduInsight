import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User, Role, SystemAccessLog
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student, TeacherProfile
from apps.quizzes.models import AcademicTerm, Lesson, Topic, Skill, Quiz, Question, LearningMaterial
from apps.attempts.models import QuizAttempt, AttemptAnswer, StudentLessonProgress, StudentContentProgress, StudentRemediationState, TeacherIntervention
from apps.analytics.models import RiskPrediction, Analytics

print("=== LIVE RUNTIME DB VERIFICATION COUNTS ===")
print(f"Users Total: {User.objects.count()}")
print(f"  System Admin: {User.objects.filter(role__role_name=Role.ROLE_SYSTEM_ADMIN).count()}")
print(f"  Teachers: {User.objects.filter(role__role_name=Role.ROLE_TEACHER).count()}")
print(f"  Students: {User.objects.filter(role__role_name=Role.ROLE_STUDENT).count()}")
print(f"Schools: {School.objects.count()}")
print(f"Classrooms: {SchoolClass.objects.count()}")
print(f"Terms: {AcademicTerm.objects.count()}")
print(f"Lessons: {Lesson.objects.count()}")
print(f"Topics: {Topic.objects.count()}")
print(f"Skills: {Skill.objects.count()}")
print(f"Learning Materials: {LearningMaterial.objects.count()}")
print(f"Quizzes: {Quiz.objects.count()}")
print(f"Questions: {Question.objects.count()}")
print(f"Quiz Attempts: {QuizAttempt.objects.count()}")
print(f"Attempt Answers: {AttemptAnswer.objects.count()}")
print(f"Student Lesson Progress: {StudentLessonProgress.objects.count()}")
print(f"Student Content Progress: {StudentContentProgress.objects.count()}")
print(f"Risk Predictions: {RiskPrediction.objects.count()}")
print(f"Student Remediation States: {StudentRemediationState.objects.count()}")
print(f"Teacher Interventions: {TeacherIntervention.objects.count()}")
print(f"System Access Logs: {SystemAccessLog.objects.count()}")

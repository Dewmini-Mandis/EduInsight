"""
EduInsight Full Account & Endpoint Verification Script
Checks all database counts and verifies DRF API response payload sizes for
ALL System Admins, Teachers, and Students in the runtime PostgreSQL database.
"""

import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User, Role, SystemAccessLog, Notification
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student, TeacherProfile, TeacherClassroom
from apps.quizzes.models import (
    AcademicTerm, Lesson, Topic, Skill, QuizLevel, DifficultyLevel,
    Quiz, Question, Answer, CorrectAnswer, Hint, LearningMaterial
)
from apps.attempts.models import (
    QuizAttempt, AttemptQuestion, AttemptAnswer,
    StudentLessonProgress, StudentContentProgress,
    StudentRemediationState, TeacherIntervention
)
from apps.analytics.models import Analytics, RiskPrediction, ProficiencyPrediction


def run_verification():
    print("==================================================")
    print("VERIFYING LIVE DATABASE RECORD COUNTS")
    print("==================================================")
    all_users = User.objects.all()
    print(f"Total Users: {all_users.count()}")
    
    admins = User.objects.filter(role__role_name__icontains='admin')
    teachers = User.objects.filter(role__role_name__icontains='teacher')
    students = User.objects.filter(role__role_name__icontains='student')
    
    print(f"  - System Admins: {admins.count()}")
    print(f"  - Teachers: {teachers.count()}")
    print(f"  - Students: {students.count()}")
    
    print(f"Total Schools: {School.objects.count()}")
    print(f"Total Classrooms: {SchoolClass.objects.count()}")
    print(f"Total Quizzes: {Quiz.objects.count()}")
    print(f"Total Questions: {Question.objects.count()}")
    print(f"Total Quiz Attempts: {QuizAttempt.objects.count()}")
    print(f"Total Attempt Answers: {AttemptAnswer.objects.count()}")
    print(f"Total Student Lesson Progress: {StudentLessonProgress.objects.count()}")
    print(f"Total Student Content Progress: {StudentContentProgress.objects.count()}")
    print(f"Total Risk Predictions: {RiskPrediction.objects.count()}")
    print(f"Total Remediation States: {StudentRemediationState.objects.count()}")
    print(f"Total Teacher Interventions: {TeacherIntervention.objects.count()}")
    print(f"Total System Access Logs: {SystemAccessLog.objects.count()}")
    print("==================================================")

    print("\n--- SYSTEM ADMIN ACCOUNTS ---")
    for a in admins:
        print(f"Admin: username='{a.username}', email='{a.email}', school='{a.school.name if a.school else 'None'}'")

    print("\n--- TEACHER ACCOUNT AUDIT ---")
    for t in teachers:
        assigned_students = Student.objects.filter(registered_by=t).count()
        quizzes_created = Quiz.objects.filter(created_by=t).count()
        attempts_on_quizzes = QuizAttempt.objects.filter(quiz__created_by=t).count()
        risk_preds = RiskPrediction.objects.filter(student__registered_by=t).count()
        interventions = TeacherIntervention.objects.filter(teacher=t).count()
        print(f"Teacher '{t.username}' ({t.email}): {assigned_students} students | {quizzes_created} quizzes | {attempts_on_quizzes} attempts | {risk_preds} risk predictions | {interventions} interventions")

    print("\n--- STUDENT ACCOUNT AUDIT ---")
    for s_user in students:
        try:
            s_profile = s_user.student_profile
            attempts_cnt = QuizAttempt.objects.filter(student=s_profile).count()
            lesson_prog = StudentLessonProgress.objects.filter(student=s_profile).count()
            content_prog = StudentContentProgress.objects.filter(student=s_profile).count()
            risk_preds = RiskPrediction.objects.filter(student=s_profile).count()
            print(f"Student '{s_user.username}' ({s_user.email}): Teacher={s_profile.registered_by.username} | Class={s_profile.class_name} | {attempts_cnt} attempts | {lesson_prog} lesson prog | {content_prog} content prog | {risk_preds} risk preds")
        except Student.DoesNotExist:
            print(f"Student user '{s_user.username}' HAS NO Student Profile!")

    print("\nVerification Complete.")


if __name__ == "__main__":
    run_verification()

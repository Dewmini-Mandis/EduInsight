import os
import sys
import time
import json
import django

# Setup Django environment
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection, reset_queries
from django.test import RequestFactory
from rest_framework.test import force_authenticate
from apps.accounts.models import User, Role
from apps.quizzes.models import Lesson, Quiz, LearningMaterial
from apps.attempts.models import QuizAttempt

# Import views
from apps.accounts.views import MeView, UserViewSet, LoginView
from apps.quizzes.views import (
    AcademicTermViewSet, LessonViewSet, TopicViewSet, SkillViewSet,
    QuizViewSet, LearningMaterialViewSet, QuizLevelViewSet, DifficultyLevelViewSet
)
from apps.classes.views import SchoolClassViewSet, TeacherClassroomViewSet, ClassroomAccessRequestViewSet
from apps.attempts.views import QuizAttemptViewSet, StudentLessonProgressViewSet, StudentContentProgressViewSet
from apps.analytics.views import AnalyticsViewSet, RiskPredictionViewSet, ProficiencyPredictionViewSet
from apps.recommendations.views import RecommendationViewSet, RemediationViewSet
from apps.audit.views import AuditLogViewSet

factory = RequestFactory()

def profile_endpoint(name, view_func_or_set, action=None, method="GET", url="/", query_params=None, data=None, user=None, pk=None):
    if query_params:
        from urllib.parse import urlencode
        url = f"{url}?{urlencode(query_params)}"
    
    if method == "GET":
        request = factory.get(url, HTTP_HOST="localhost")
    elif method == "POST":
        request = factory.post(url, data=data or {}, content_type="application/json", HTTP_HOST="localhost")
    
    if user:
        force_authenticate(request, user=user)
    
    reset_queries()
    start_time = time.perf_counter()
    
    try:
        if action and hasattr(view_func_or_set, "as_view"):
            if pk is not None:
                view = view_func_or_set.as_view({method.lower(): action})
                response = view(request, pk=pk)
            else:
                view = view_func_or_set.as_view({method.lower(): action})
                response = view(request)
        elif hasattr(view_func_or_set, "as_view"):
            view = view_func_or_set.as_view()
            if pk is not None:
                response = view(request, pk=pk)
            else:
                response = view(request)
        else:
            response = view_func_or_set(request)
            
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        queries = list(connection.queries)
        db_time_ms = sum(float(q.get("time", 0)) for q in queries) * 1000.0
        query_count = len(queries)
        
        status_code = getattr(response, "status_code", 200)
        
        # Calculate payload size
        try:
            if hasattr(response, "render"):
                response.render()
            payload_size = len(response.content) if hasattr(response, "content") else 0
        except Exception:
            payload_size = 0
            
        return {
            "name": name,
            "status": status_code,
            "query_count": query_count,
            "response_time_ms": round(elapsed_ms, 1),
            "db_time_ms": round(db_time_ms, 1),
            "payload_size_bytes": payload_size,
            "success": status_code in [200, 201]
        }
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return {
            "name": name,
            "status": 500,
            "error": str(e),
            "query_count": len(connection.queries),
            "response_time_ms": round(elapsed_ms, 1),
            "db_time_ms": 0,
            "payload_size_bytes": 0,
            "success": False
        }

def run_all_profiles():
    # Warmup connection
    connection.ensure_connection()
    
    # Get test users
    admin_user = User.objects.filter(role__role_name=Role.ROLE_SYSTEM_ADMIN).first() or User.objects.filter(is_superuser=True).first()
    teacher_user = User.objects.filter(role__role_name=Role.ROLE_TEACHER).first()
    student_user = User.objects.filter(role__role_name=Role.ROLE_STUDENT).first()
    
    sample_lesson = Lesson.objects.first()
    sample_quiz = Quiz.objects.filter(is_deleted=False).first()
    sample_attempt = QuizAttempt.objects.first()
    
    results = []
    
    # Auth endpoints
    results.append(profile_endpoint("GET /api/accounts/me/ (Student)", MeView, user=student_user, url="/api/accounts/me/"))
    results.append(profile_endpoint("GET /api/accounts/me/ (Teacher)", MeView, user=teacher_user, url="/api/accounts/me/"))
    results.append(profile_endpoint("GET /api/accounts/me/ (Admin)", MeView, user=admin_user, url="/api/accounts/me/"))
    
    # Admin User endpoints
    results.append(profile_endpoint("GET /api/accounts/users/ (All Users)", UserViewSet, action="list", user=admin_user, url="/api/accounts/users/"))
    results.append(profile_endpoint("GET /api/accounts/users/?role=TEACHER", UserViewSet, action="list", user=admin_user, url="/api/accounts/users/", query_params={"role": "TEACHER"}))
    results.append(profile_endpoint("GET /api/accounts/users/?role=STUDENT", UserViewSet, action="list", user=admin_user, url="/api/accounts/users/", query_params={"role": "STUDENT"}))
    
    # Classes endpoints
    results.append(profile_endpoint("GET /api/classes/classrooms/ (Teacher)", SchoolClassViewSet, action="list", user=teacher_user, url="/api/classes/classrooms/"))
    results.append(profile_endpoint("GET /api/classes/teacher-assignments/ (Admin)", TeacherClassroomViewSet, action="list", user=admin_user, url="/api/classes/teacher-assignments/"))
    results.append(profile_endpoint("GET /api/classes/access-requests/ (Admin)", ClassroomAccessRequestViewSet, action="list", user=admin_user, url="/api/classes/access-requests/"))
    
    # Quizzes & Curriculum endpoints
    results.append(profile_endpoint("GET /api/quizzes/terms/", AcademicTermViewSet, action="list", user=student_user, url="/api/quizzes/terms/"))
    results.append(profile_endpoint("GET /api/quizzes/lessons/ (Student)", LessonViewSet, action="list", user=student_user, url="/api/quizzes/lessons/"))
    results.append(profile_endpoint("GET /api/quizzes/topics/", TopicViewSet, action="list", user=teacher_user, url="/api/quizzes/topics/"))
    results.append(profile_endpoint("GET /api/quizzes/skills/", SkillViewSet, action="list", user=teacher_user, url="/api/quizzes/skills/"))
    results.append(profile_endpoint("GET /api/quizzes/levels/", QuizLevelViewSet, action="list", user=teacher_user, url="/api/quizzes/levels/"))
    results.append(profile_endpoint("GET /api/quizzes/difficulties/", DifficultyLevelViewSet, action="list", user=teacher_user, url="/api/quizzes/difficulties/"))
    results.append(profile_endpoint("GET /api/quizzes/ (Teacher List)", QuizViewSet, action="list", user=teacher_user, url="/api/quizzes/"))
    results.append(profile_endpoint("GET /api/quizzes/ (Student List)", QuizViewSet, action="list", user=student_user, url="/api/quizzes/"))
    results.append(profile_endpoint("GET /api/quizzes/materials/ (Teacher List)", LearningMaterialViewSet, action="list", user=teacher_user, url="/api/quizzes/materials/"))
    
    if sample_lesson:
        results.append(profile_endpoint(f"GET /api/quizzes/lessons/{sample_lesson.id}/student_quizzes/", LessonViewSet, action="student_quizzes", pk=sample_lesson.id, user=student_user, url=f"/api/quizzes/lessons/{sample_lesson.id}/student_quizzes/"))
    
    # Attempts endpoints
    results.append(profile_endpoint("GET /api/attempts/attempts/ (Student List)", QuizAttemptViewSet, action="list", user=student_user, url="/api/attempts/attempts/"))
    results.append(profile_endpoint("GET /api/attempts/attempts/ (Teacher List)", QuizAttemptViewSet, action="list", user=teacher_user, url="/api/attempts/attempts/"))
    
    student_attempt = QuizAttempt.objects.filter(student__user=student_user).first() or sample_attempt
    if student_attempt:
        owner = student_attempt.student.user if student_attempt.student else student_user
        results.append(profile_endpoint(f"GET /api/attempts/attempts/{student_attempt.id}/ (Detail)", QuizAttemptViewSet, action="retrieve", pk=student_attempt.id, user=owner, url=f"/api/attempts/attempts/{student_attempt.id}/"))
    
    if sample_quiz:
        results.append(profile_endpoint(f"GET /api/attempts/attempts/remediation_status/?quiz={sample_quiz.id}", QuizAttemptViewSet, action="remediation_status", user=student_user, url="/api/attempts/attempts/remediation_status/", query_params={"quiz": sample_quiz.id}))
        results.append(profile_endpoint(f"GET /api/attempts/attempts/remediation_summary/?quiz={sample_quiz.id}", QuizAttemptViewSet, action="remediation_summary", user=student_user, url="/api/attempts/attempts/remediation_summary/", query_params={"quiz": sample_quiz.id}))
        
    results.append(profile_endpoint("GET /api/attempts/lesson-progress/ (Student)", StudentLessonProgressViewSet, action="list", user=student_user, url="/api/attempts/lesson-progress/"))
    results.append(profile_endpoint("GET /api/attempts/content-progress/ (Student)", StudentContentProgressViewSet, action="list", user=student_user, url="/api/attempts/content-progress/"))
    
    # Analytics endpoints
    results.append(profile_endpoint("GET /api/analytics/overview/ (Teacher)", AnalyticsViewSet, action="list", user=teacher_user, url="/api/analytics/overview/"))
    results.append(profile_endpoint("GET /api/analytics/risk/ (Teacher)", RiskPredictionViewSet, action="list", user=teacher_user, url="/api/analytics/risk/"))
    results.append(profile_endpoint("GET /api/analytics/proficiency/ (Teacher)", ProficiencyPredictionViewSet, action="list", user=teacher_user, url="/api/analytics/proficiency/"))
    
    # Recommendations & Remediation
    results.append(profile_endpoint("GET /api/recommendations/recommendations/ (Student)", RecommendationViewSet, action="list", user=student_user, url="/api/recommendations/recommendations/"))
    results.append(profile_endpoint("GET /api/recommendations/remediations/ (Student)", RemediationViewSet, action="list", user=student_user, url="/api/recommendations/remediations/"))
    
    # Audit endpoints
    results.append(profile_endpoint("GET /api/audit/activities/ (Admin)", AuditLogViewSet, action="list", user=admin_user, url="/api/audit/activities/"))
    
    # Print results summary
    print(f"\n{'ENDPOINT':<65} | {'STATUS':<6} | {'SQL Qs':<6} | {'RESP (ms)':<9} | {'DB (ms)':<8} | {'SIZE (B)':<8}")
    print("-" * 115)
    for r in results:
        status_str = str(r['status']) if r['success'] else f"ERR {r['status']}"
        print(f"{r['name']:<65} | {status_str:<6} | {r.get('query_count', 0):<6} | {r.get('response_time_ms', 0):<9.1f} | {r.get('db_time_ms', 0):<8.1f} | {r.get('payload_size_bytes', 0):<8}")
        
    # Statistical Summary
    total = len(results)
    under_300 = len([r for r in results if r.get('response_time_ms', 0) < 300])
    under_800 = len([r for r in results if 300 <= r.get('response_time_ms', 0) < 800])
    under_1000 = len([r for r in results if 800 <= r.get('response_time_ms', 0) < 1000])
    over_1000 = len([r for r in results if r.get('response_time_ms', 0) >= 1000])
    
    print("\n" + "=" * 50)
    print("STATISTICAL SUMMARY")
    print("=" * 50)
    print(f"Total Endpoints Profiled: {total}")
    print(f"Endpoints < 300 ms:       {under_300} ({under_300/total*100:.1f}%)")
    print(f"Endpoints 300 - 800 ms:   {under_800} ({under_800/total*100:.1f}%)")
    print(f"Endpoints 800 - 1000 ms:  {under_1000} ({under_1000/total*100:.1f}%)")
    print(f"Endpoints > 1000 ms:      {over_1000} ({over_1000/total*100:.1f}%)")
    
    # Save to file
    with open("scratch/comprehensive_profile_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_all_profiles()

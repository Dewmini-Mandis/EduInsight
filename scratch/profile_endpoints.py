import os
import sys
import time
import json
import django

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection, reset_queries
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.accounts.models import User, Role
from apps.quizzes.views import QuizViewSet, LearningMaterialViewSet, LessonViewSet
from apps.attempts.views import QuizAttemptViewSet, StudentContentProgressViewSet
from apps.classes.views import SchoolClassViewSet

def profile_endpoint(view_class, action_name, request_url, user, query_params=None):
    reset_queries()
    factory = APIRequestFactory()
    request = factory.get(request_url, query_params or {}, HTTP_HOST="localhost")
    force_authenticate(request, user=user)

    view = view_class.as_view({ "get": action_name })
    
    start_time = time.perf_counter()
    response = view(request)
    end_time = time.perf_counter()

    response_time_ms = round((end_time - start_time) * 1000, 2)
    db_query_count = len(connection.queries)
    
    # Calculate payload size
    if hasattr(response, 'render'):
        response.render()
    content = response.content
    payload_size_kb = round(len(content) / 1024, 2)
    
    record_count = 0
    if isinstance(response.data, list):
        record_count = len(response.data)
    elif isinstance(response.data, dict):
        if "results" in response.data:
            record_count = len(response.data["results"])
        else:
            record_count = 1

    return {
        "endpoint": request_url,
        "response_time_ms": response_time_ms,
        "db_query_count": db_query_count,
        "payload_size_kb": payload_size_kb,
        "record_count": record_count
    }

def main():
    teacher_user = User.objects.filter(role__role_name=Role.ROLE_TEACHER).first()
    student_user = User.objects.filter(role__role_name=Role.ROLE_STUDENT).first()

    if not teacher_user:
        print("No teacher user found in DB.")
        return
    if not student_user:
        print("No student user found in DB.")
        return

    print("=== PROFILING ENDPOINTS (BEFORE OPTIMIZATION) ===")

    endpoints_to_test = [
        (QuizViewSet, "list", "/api/quizzes/quizzes/", teacher_user, {}),
        (LearningMaterialViewSet, "list", "/api/quizzes/materials/", teacher_user, {}),
        (LessonViewSet, "list", "/api/quizzes/lessons/", teacher_user, {}),
        (QuizAttemptViewSet, "list", "/api/attempts/attempts/", teacher_user, {}),
        (SchoolClassViewSet, "list", "/api/classes/classes/", teacher_user, {}),
        (QuizAttemptViewSet, "list", "/api/attempts/attempts/", student_user, {}),
        (StudentContentProgressViewSet, "list", "/api/attempts/content-progress/", student_user, {}),
    ]

    results = []
    for view_cls, act, url, usr, params in endpoints_to_test:
        res = profile_endpoint(view_cls, act, url, usr, params)
        res["user_role"] = usr.role.role_name
        results.append(res)
        print(f"[{res['user_role']}] {res['endpoint']} -> Time: {res['response_time_ms']}ms | DB Queries: {res['db_query_count']} | Payload: {res['payload_size_kb']}KB | Records: {res['record_count']}")

    with open(os.path.join(os.path.dirname(__file__), "before_profile.json"), "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()

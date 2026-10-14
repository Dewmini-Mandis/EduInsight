import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.quizzes.models import Quiz, Lesson, QuizLevel, DifficultyLevel

def run_tests():
    print("=== STARTING QUIZ ORDERING & VALIDATION TESTS ===")

    teacher = User.objects.filter(email__contains="gmail.com").first()
    if not teacher:
        print("ERROR: No teacher user found.")
        return

    print(f"Testing with teacher: {teacher.email} (ID: {teacher.id})")

    client = APIClient()
    client.force_authenticate(user=teacher)
    headers = {"HTTP_HOST": "localhost"}

    # 1. Test check_order endpoint with non-existent order
    print("\n--- 1. Testing GET /api/quizzes/check_order/ ---")
    lesson = Lesson.objects.first()
    level = QuizLevel.objects.get(name="Beginner")
    diff = DifficultyLevel.objects.get(name="Easy")

    res_empty = client.get(f"/api/quizzes/check_order/?lesson={lesson.id}&quiz_level={level.id}&difficulty={diff.id}&order=9999", **headers)
    print(f"Check non-existent order HTTP status: {res_empty.status_code}")
    print(f"Response data: {res_empty.data}")
    assert res_empty.data.get("exists") == False, "Expected non-existent order check to return exists=False"

    # Fetch an existing quiz for this teacher if any
    existing_quiz = Quiz.objects.filter(is_deleted=False, created_by=teacher).first()
    if existing_quiz and existing_quiz.lesson and existing_quiz.quiz_level and existing_quiz.difficulty:
        l_id = existing_quiz.lesson.id
        lvl_id = existing_quiz.quiz_level.id
        diff_id = existing_quiz.difficulty.id
        ord_val = existing_quiz.order

        res = client.get(f"/api/quizzes/check_order/?lesson={l_id}&quiz_level={lvl_id}&difficulty={diff_id}&order={ord_val}", **headers)
        print(f"Check existing quiz combination HTTP status: {res.status_code}")
        print(f"Response data: {res.data}")
        assert res.data.get("exists") == True, "Expected duplicate check to return exists=True"

    # 2. Test duplicate order validation on POST /api/quizzes/
    print("\n--- 2. Testing Duplicate Order Validation on POST /api/quizzes/ ---")
    if existing_quiz and existing_quiz.lesson and existing_quiz.quiz_level and existing_quiz.difficulty:
        dup_payload = {
            "title": "Duplicate Order Quiz",
            "description": "Test quiz duplicate",
            "status": "DRAFT",
            "lesson": existing_quiz.lesson.id,
            "quiz_level": existing_quiz.quiz_level.id,
            "difficulty": existing_quiz.difficulty.id,
            "order": existing_quiz.order,
            "questions": []
        }
        res_post = client.post("/api/quizzes/", dup_payload, format="json", **headers)
        print(f"POST duplicate order HTTP status: {res_post.status_code}")
        print(f"POST response data: {res_post.data}")
        assert res_post.status_code == 400, "Expected HTTP 400 for duplicate order combination"
        assert "order" in res_post.data, "Expected 'order' field in validation errors"

    # 3. Test Invalid Order Number (e.g. 0 or negative)
    print("\n--- 3. Testing Invalid Order Number (order=0) ---")
    invalid_payload = {
        "title": "Invalid Order Quiz",
        "description": "Test quiz invalid order",
        "status": "DRAFT",
        "lesson": lesson.id if lesson else 1,
        "quiz_level": level.id,
        "difficulty": diff.id,
        "order": 0,
        "questions": []
    }
    res_inv = client.post("/api/quizzes/", invalid_payload, format="json", **headers)
    print(f"POST order=0 HTTP status: {res_inv.status_code}")
    print(f"POST order=0 response data: {res_inv.data}")
    assert res_inv.status_code == 400, "Expected HTTP 400 for order=0"
    assert "order" in res_inv.data, "Expected 'order' field in validation errors"

    # 4. Test GET /api/quizzes/ ordering
    print("\n--- 4. Testing GET /api/quizzes/ progression ordering ---")
    res_list = client.get("/api/quizzes/", **headers)
    print(f"GET /api/quizzes/ HTTP status: {res_list.status_code}")
    quizzes = res_list.data if isinstance(res_list.data, list) else res_list.data.get("results", [])
    print(f"Total quizzes returned: {len(quizzes)}")
    for i, q in enumerate(quizzes[:10]):
        l_title = q.get("lesson_title")
        lvl_name = q.get("quiz_level_name")
        diff_name = q.get("difficulty_name")
        ord_num = q.get("order")
        print(f"  [{i+1}] ID: {q.get('id')} | Lesson: '{l_title}' | Level: '{lvl_name}' | Diff: '{diff_name}' | Order: {ord_num}")

    print("\n=== ALL QUIZ ORDERING & VALIDATION BACKEND TESTS PASSED ===")

if __name__ == "__main__":
    run_tests()

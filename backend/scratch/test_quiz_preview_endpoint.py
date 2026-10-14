import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.quizzes.models import Quiz

def run_tests():
    print("=== STARTING TEACHER QUIZ PREVIEW API VERIFICATION ===")

    teacher = User.objects.filter(email__contains="gmail.com").first()
    if not teacher:
        print("ERROR: No teacher user found.")
        return

    print(f"Testing with teacher: {teacher.email} (ID: {teacher.id})")

    client = APIClient()
    client.force_authenticate(user=teacher)
    headers = {"HTTP_HOST": "localhost"}

    quiz = Quiz.objects.filter(is_deleted=False, created_by=teacher).first()
    if not quiz:
        print("No quiz found for teacher.")
        return

    print(f"Testing Preview for Quiz ID {quiz.id}: '{quiz.title}'")

    res = client.get(f"/api/quizzes/{quiz.id}/", **headers)
    print(f"HTTP Status Code: {res.status_code}")
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}"

    data = res.data
    print(f"Quiz Title: {data.get('title')}")
    print(f"Lesson Title: {data.get('lesson_title')}")
    print(f"Level Name: {data.get('quiz_level_name')}")
    print(f"Difficulty Name: {data.get('difficulty_name')}")
    print(f"Questions Count: {len(data.get('questions', []))}")

    questions = data.get("questions", [])
    if questions:
        q1 = questions[0]
        print(f"\nSample Question 1:")
        print(f"  Text: {q1.get('question_text')}")
        print(f"  Type: {q1.get('question_type')}")
        print(f"  Points: {q1.get('points')}")
        print(f"  Answers Count: {len(q1.get('answers', []))}")
        for a in q1.get("answers", []):
            print(f"    Option: '{a.get('answer_text')}' | Correct: {a.get('is_correct')}")

    print("\n=== TEACHER QUIZ PREVIEW API VERIFICATION PASSED ===")

if __name__ == "__main__":
    run_tests()

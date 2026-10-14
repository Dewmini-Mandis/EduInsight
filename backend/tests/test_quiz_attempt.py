from django.test import TestCase
from django.db import transaction
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student
from apps.quizzes.models import AcademicTerm, Lesson, QuizLevel, DifficultyLevel, Quiz, Question, Answer
from apps.attempts.models import QuizAttempt, AttemptAnswer

class QuizAttemptCreationTestCase(TestCase):
    def setUp(self):
        student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)
        teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.school = School.objects.create(name="Test School 2")
        self.teacher_user = User.objects.create_user(
            username="teacher_test_attempt",
            email="teacher_test_attempt@test.com",
            password="password123",
            role=teacher_role,
            school=self.school
        )
        self.student_user = User.objects.create_user(
            username="student_test_attempt",
            email="student_test_attempt@test.com",
            password="password123",
            role=student_role,
            school=self.school
        )
        self.classroom = SchoolClass.objects.create(name="Class 10B", school=self.school)
        self.student = Student.objects.create(
            user=self.student_user,
            registered_by=self.teacher_user,
            class_room=self.classroom
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.student_user)

        self.term = AcademicTerm.objects.create(name="Term 2", order=2)
        self.lesson = Lesson.objects.create(title="Lesson 2", term=self.term)
        self.level = QuizLevel.objects.create(name="Intermediate", order=2)
        self.diff = DifficultyLevel.objects.create(name="Medium", order=2)

        self.quiz = Quiz.objects.create(
            title="Attempt Test Quiz",
            lesson=self.lesson,
            school=self.school,
            created_by=self.teacher_user,
            assigned_class=self.classroom,
            status="PUBLISHED",
            quiz_level=self.level,
            difficulty=self.diff,
            pass_mark=70,
            max_attempts=2
        )
        self.questions = []
        for i in range(10):
            q = Question.objects.create(quiz=self.quiz, question_text=f"Q{i+1}", question_type=Question.TYPE_MCQ)
            a_corr = Answer.objects.create(question=q, answer_text="Correct", is_correct=True)
            a_wrg = Answer.objects.create(question=q, answer_text="Wrong", is_correct=False)
            self.questions.append((q, a_corr, a_wrg))
        self.q1, self.a1_correct, self.a1_wrong = self.questions[0]

        self.other_quiz = Quiz.objects.create(
            title="Other Quiz",
            lesson=self.lesson,
            school=self.school,
            created_by=self.teacher_user,
            assigned_class=self.classroom,
            status="PUBLISHED"
        )
        self.other_q = Question.objects.create(quiz=self.other_quiz, question_text="Other Q", question_type=Question.TYPE_MCQ)
        self.other_a = Answer.objects.create(question=self.other_q, answer_text="Other A", is_correct=True)

    def test_valid_submission(self):
        answers = [{"question": q.id, "selected_answer": a_corr.id, "hint_count": 0} for q, a_corr, _ in self.questions]
        payload = {
            "quiz": self.quiz.id,
            "answers": answers
        }
        response = self.client.post("/api/attempts/attempts/", payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertEqual(response.data["score"], 100.0)
        self.assertEqual(AttemptAnswer.objects.filter(attempt_id=response.data["id"]).count(), 10)

    def test_invalid_question_id_ignored(self):
        answers = [{"question": q.id, "selected_answer": a_corr.id} for q, a_corr, _ in self.questions]
        answers.append({"question": 99999, "selected_answer": 99999})
        payload = {
            "quiz": self.quiz.id,
            "answers": answers
        }
        response = self.client.post("/api/attempts/attempts/", payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        # 99999 should be filtered out
        self.assertEqual(AttemptAnswer.objects.filter(attempt_id=response.data["id"]).count(), 10)

    def test_answer_from_another_question_treated_as_unselected(self):
        answers = [{"question": q.id, "selected_answer": a_corr.id} for q, a_corr, _ in self.questions]
        answers[0] = {"question": self.q1.id, "selected_answer": self.other_a.id}
        payload = {
            "quiz": self.quiz.id,
            "answers": answers
        }
        response = self.client.post("/api/attempts/attempts/", payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        ans = AttemptAnswer.objects.get(attempt_id=response.data["id"], question=self.q1)
        self.assertIsNone(ans.selected_answer)
        self.assertFalse(ans.is_correct)

    def test_max_attempts_exceeded(self):
        for i in range(2):
            QuizAttempt.objects.create(student=self.student, quiz=self.quiz, attempt_number=i+1, start_time=self.student_user.date_joined)

        payload = {"quiz": self.quiz.id, "answers": []}
        response = self.client.post("/api/attempts/attempts/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maximum limit", response.data["detail"])

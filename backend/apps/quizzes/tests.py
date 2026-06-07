from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.quizzes.models import Quiz, Question, Answer, CorrectAnswer


class QuizAPITests(APITestCase):
    def setUp(self):
        # Create roles
        self.sys_admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)
        self.nat_admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_NATIONAL_ADMIN)
        self.school_admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SCHOOL_ADMIN)
        self.teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)

        # Create schools
        self.school_a = School.objects.create(
            name="School A",
            location="Location A",
            address="Address A",
            province="Western",
            district="Colombo",
            zone="Zone A",
            educational_zone="Ed Zone A"
        )
        self.school_b = School.objects.create(
            name="School B",
            location="Location B",
            address="Address B",
            province="Western",
            district="Gampaha",
            zone="Zone B",
            educational_zone="Ed Zone B"
        )

        # Create users
        self.sys_admin = User.objects.create_user(
            username="sys_admin", email="sys@test.com", password="password123", role=self.sys_admin_role
        )
        self.nat_admin = User.objects.create_user(
            username="nat_admin", email="nat@test.com", password="password123", role=self.nat_admin_role
        )
        self.school_admin_a = User.objects.create_user(
            username="school_admin_a", email="sa_a@test.com", password="password123", role=self.school_admin_role, school=self.school_a
        )
        self.school_admin_b = User.objects.create_user(
            username="school_admin_b", email="sa_b@test.com", password="password123", role=self.school_admin_role, school=self.school_b
        )
        self.teacher_a = User.objects.create_user(
            username="teacher_a", email="t_a@test.com", password="password123", role=self.teacher_role, school=self.school_a
        )
        self.student_a = User.objects.create_user(
            username="student_a", email="s_a@test.com", password="password123", role=self.student_role, school=self.school_a
        )

        # URL for listing/creating quizzes
        self.list_url = "/api/quizzes/"

    def test_national_admin_create_quiz_nested(self):
        """
        Verify that a National Admin can create a quiz with nested MCQ and Numeric questions in a single request.
        """
        self.client.force_authenticate(user=self.nat_admin)
        
        payload = {
            "title": "Maths and Science Diagnostic",
            "description": "National level baseline diagnostic.",
            "school": None,  # National quiz
            "questions": [
                {
                    "question_text": "What is 2 + 2?",
                    "question_type": "MCQ",
                    "difficulty_level": "Easy",
                    "answers": [
                        {"answer_text": "3", "is_correct": False},
                        {"answer_text": "4", "is_correct": True},
                        {"answer_text": "5", "is_correct": False}
                    ]
                },
                {
                    "question_text": "Solve for x: 2x = 10",
                    "question_type": "NUMERIC",
                    "difficulty_level": "Medium",
                    "correct_value": "5"
                }
            ]
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify db persistence
        self.assertEqual(Quiz.objects.count(), 1)
        quiz = Quiz.objects.first()
        self.assertEqual(quiz.title, "Maths and Science Diagnostic")
        self.assertEqual(quiz.created_by, self.nat_admin)
        self.assertNil = False
        self.assertEqual(quiz.school, None)
        
        # Verify questions
        questions = quiz.questions.all().order_by("id")
        self.assertEqual(questions.count(), 2)
        
        # Q1 MCQ
        q1 = questions[0]
        self.assertEqual(q1.question_type, "MCQ")
        self.assertEqual(q1.answers.count(), 3)
        self.assertTrue(q1.answers.filter(answer_text="4", is_correct=True).exists())

        # Q2 Numeric
        q2 = questions[1]
        self.assertEqual(q2.question_type, "NUMERIC")
        self.assertEqual(q2.correct_answer.correct_value, "5")

    def test_queryset_filtering_by_role(self):
        """
        Verify role-based filtering:
        - System and National Admin see everything.
        - School Admin/Teacher only see their school's quizzes, national quizzes (school is null), or quizzes they created.
        - Students only see their school's quizzes or national quizzes (school is null).
        """
        # Create a national quiz
        quiz_nat = Quiz.objects.create(title="National Quiz", created_by=self.nat_admin, school=None)
        
        # Create a school A quiz
        quiz_a = Quiz.objects.create(title="School A Quiz", created_by=self.school_admin_a, school=self.school_a)
        
        # Create a school B quiz
        quiz_b = Quiz.objects.create(title="School B Quiz", created_by=self.school_admin_b, school=self.school_b)

        # 1. National Admin sees all 3 quizzes
        self.client.force_authenticate(user=self.nat_admin)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 3)

        # 2. School Admin A sees National Quiz and School A Quiz (2 quizzes)
        self.client.force_authenticate(user=self.school_admin_a)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)
        quiz_titles = [q["title"] for q in res.data]
        self.assertIn("National Quiz", quiz_titles)
        self.assertIn("School A Quiz", quiz_titles)
        self.assertNotIn("School B Quiz", quiz_titles)

        # 3. Student A sees National Quiz and School A Quiz (2 quizzes)
        self.client.force_authenticate(user=self.student_a)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

    def test_delete_cascade_cleanup(self):
        """
        Verify deleting a quiz cascadingly deletes nested questions, answers, and correct answers.
        """
        quiz = Quiz.objects.create(title="Quiz to Delete", created_by=self.nat_admin)
        question = Question.objects.create(quiz=quiz, question_text="Q1", question_type="MCQ")
        Answer.objects.create(question=question, answer_text="Option 1", is_correct=True)
        
        question2 = Question.objects.create(quiz=quiz, question_text="Q2", question_type="NUMERIC")
        CorrectAnswer.objects.create(question=question2, correct_value="10")

        self.assertEqual(Quiz.objects.count(), 1)
        self.assertEqual(Question.objects.count(), 2)
        self.assertEqual(Answer.objects.count(), 1)
        self.assertEqual(CorrectAnswer.objects.count(), 1)

        self.client.force_authenticate(user=self.nat_admin)
        res = self.client.delete(f"{self.list_url}{quiz.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.assertEqual(Quiz.objects.count(), 0)
        self.assertEqual(Question.objects.count(), 0)
        self.assertEqual(Answer.objects.count(), 0)
        self.assertEqual(CorrectAnswer.objects.count(), 0)

    def test_student_cannot_create_quiz(self):
        """
        Verify that student role is forbidden from creating quizzes.
        """
        self.client.force_authenticate(user=self.student_a)
        payload = {
            "title": "Student Quiz",
            "questions": []
        }
        res = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.quizzes.models import Quiz, Question, Answer, CorrectAnswer, AcademicTerm, Lesson


class QuizAPITests(APITestCase):
    def setUp(self):
        # Create roles
        self.sys_admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)
        self.teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)
        self.student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)

        # Create Academic Terms
        self.term1 = AcademicTerm.objects.create(name="1st Term", order=1)

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
        self.teacher_a = User.objects.create_user(
            username="teacher_a", email="t_a@test.com", password="password123", role=self.teacher_role, school=self.school_a
        )
        self.teacher_b = User.objects.create_user(
            username="teacher_b", email="t_b@test.com", password="password123", role=self.teacher_role, school=self.school_b
        )
        self.student_a = User.objects.create_user(
            username="student_a", email="s_a@test.com", password="password123", role=self.student_role, school=self.school_a
        )

        # URL for listing/creating quizzes
        self.list_url = "/api/quizzes/"

    def test_system_admin_create_quiz_nested(self):
        """
        Verify that a System Admin can create a quiz with nested MCQ and Numeric questions in a single request.
        """
        self.client.force_authenticate(user=self.sys_admin)
        
        payload = {
            "title": "Maths and Science Diagnostic",
            "description": "System level baseline diagnostic.",
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
        self.assertEqual(quiz.created_by, self.sys_admin)
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
        - System Admin sees everything.
        - Teacher only sees their school's quizzes, national quizzes (school is null), or quizzes they created.
        - Students only see their school's quizzes or national quizzes (school is null).
        """
        # Create a national quiz
        quiz_nat = Quiz.objects.create(title="National Quiz", created_by=self.sys_admin, school=None)
        
        # Create a school A quiz
        quiz_a = Quiz.objects.create(title="School A Quiz", created_by=self.teacher_a, school=self.school_a)
        
        # Create a school B quiz
        quiz_b = Quiz.objects.create(title="School B Quiz", created_by=self.teacher_b, school=self.school_b)

        # 1. System Admin sees all 3 quizzes
        self.client.force_authenticate(user=self.sys_admin)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 3)

        # 2. Teacher A sees National Quiz and School A Quiz (2 quizzes)
        self.client.force_authenticate(user=self.teacher_a)
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
        quiz = Quiz.objects.create(title="Quiz to Delete", created_by=self.sys_admin)
        question = Question.objects.create(quiz=quiz, question_text="Q1", question_type="MCQ")
        Answer.objects.create(question=question, answer_text="Option 1", is_correct=True)
        
        question2 = Question.objects.create(quiz=quiz, question_text="Q2", question_type="NUMERIC")
        CorrectAnswer.objects.create(question=question2, correct_value="10")

        self.assertEqual(Quiz.objects.count(), 1)
        self.assertEqual(Question.objects.count(), 2)
        self.assertEqual(Answer.objects.count(), 1)
        self.assertEqual(CorrectAnswer.objects.count(), 1)

        self.client.force_authenticate(user=self.sys_admin)
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

    def test_lesson_crud_permissions(self):
        """
        Verify that System Admin and Teachers can create, edit, delete lessons.
        """
        lesson_url = "/api/quizzes/lessons/"
        
        # Student cannot create a lesson
        self.client.force_authenticate(user=self.student_a)
        payload = {
            "title": "Student Lesson",
            "description": "Attempted by student",
            "term": self.term1.id
        }
        res = self.client.post(lesson_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # System Admin can create a lesson
        self.client.force_authenticate(user=self.sys_admin)
        payload["title"] = "System Admin Lesson"
        res = self.client.post(lesson_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        lesson_id = res.data["id"]

        # Student cannot update the lesson
        self.client.force_authenticate(user=self.student_a)
        res = self.client.patch(f"{lesson_url}{lesson_id}/", {"title": "Hacked Title"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Teacher can update the lesson
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.patch(f"{lesson_url}{lesson_id}/", {"title": "Updated Title"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "Updated Title")

        # Student cannot delete the lesson
        self.client.force_authenticate(user=self.student_a)
        res = self.client.delete(f"{lesson_url}{lesson_id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Teacher can delete the lesson
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.delete(f"{lesson_url}{lesson_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_quiz_filtering_by_lesson(self):
        """
        Verify that quizzes can be filtered by the lesson query parameter.
        """
        lesson_1 = Lesson.objects.create(title="Lesson 1", term=self.term1, created_by=self.sys_admin)
        lesson_2 = Lesson.objects.create(title="Lesson 2", term=self.term1, created_by=self.sys_admin)

        quiz_1 = Quiz.objects.create(title="Quiz 1", created_by=self.sys_admin, lesson=lesson_1)
        quiz_2 = Quiz.objects.create(title="Quiz 2", created_by=self.sys_admin, lesson=lesson_2)

        self.client.force_authenticate(user=self.student_a)
        
        # Retrieve all
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should see quiz_1 and quiz_2
        quiz_ids = [q["id"] for q in res.data]
        self.assertIn(quiz_1.id, quiz_ids)
        self.assertIn(quiz_2.id, quiz_ids)

        # Filter by lesson_1
        res = self.client.get(f"{self.list_url}?lesson={lesson_1.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        filtered_ids = [q["id"] for q in res.data]
        self.assertIn(quiz_1.id, filtered_ids)
        self.assertNotIn(quiz_2.id, filtered_ids)

        # Filter by lesson_2
        res = self.client.get(f"{self.list_url}?lesson={lesson_2.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        filtered_ids = [q["id"] for q in res.data]
        self.assertIn(quiz_2.id, filtered_ids)
        self.assertNotIn(quiz_1.id, filtered_ids)

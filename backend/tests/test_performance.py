import time
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student
from apps.quizzes.models import AcademicTerm, Lesson, Topic, Skill, QuizLevel, DifficultyLevel, Quiz, Question, Answer, LearningMaterial
from apps.attempts.models import QuizAttempt

class EndpointPerformanceBaselineTestCase(TestCase):
    def setUp(self):
        admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)
        
        self.school = School.objects.create(name="Test School", location="Colombo")
        self.admin_user = User.objects.create_user(
            username="admin_perf",
            email="admin_perf@test.com",
            password="password123",
            role=admin_role,
            school=self.school,
            first_name="Admin",
            last_name="User"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)
        
        self.term = AcademicTerm.objects.create(name="Term 1", order=1)
        self.lesson = Lesson.objects.create(title="Lesson 1", term=self.term, created_by=self.admin_user)
        self.topic = Topic.objects.create(name="Topic 1", lesson=self.lesson)
        self.skill = Skill.objects.create(name="Skill 1", topic=self.topic)
        self.level = QuizLevel.objects.create(name="Beginner", order=1)
        self.diff = DifficultyLevel.objects.create(name="Easy", order=1)
        self.classroom = SchoolClass.objects.create(name="Class 10A", school=self.school)

        # Seed 10 Learning Materials
        for i in range(10):
            LearningMaterial.objects.create(
                title=f"Material {i}",
                material_type="TEXT",
                content=f"Content {i}",
                lesson=self.lesson,
                topic=self.topic,
                skill=self.skill,
                created_by=self.admin_user
            )

        # Seed 10 Quizzes with Questions and Answers
        for i in range(10):
            quiz = Quiz.objects.create(
                title=f"Quiz {i}",
                lesson=self.lesson,
                school=self.school,
                assigned_class=self.classroom,
                quiz_level=self.level,
                difficulty=self.diff,
                created_by=self.admin_user,
                topic=self.topic,
                skill=self.skill
            )
            for j in range(3):
                q = Question.objects.create(
                    quiz=quiz,
                    question_text=f"Question {j} for Quiz {i}",
                    question_type=Question.TYPE_MCQ
                )
                Answer.objects.create(question=q, answer_text="Option A", is_correct=True)
                Answer.objects.create(question=q, answer_text="Option B", is_correct=False)

        # Seed 10 Quiz Attempts
        student_user = User.objects.create_user(username="student_perf", email="student@test.com", password="pass", school=self.school)
        student = Student.objects.create(user=student_user)
        quiz = Quiz.objects.first()
        for i in range(10):
            QuizAttempt.objects.create(
                student=student,
                quiz=quiz,
                attempt_number=i + 1,
                start_time=self.admin_user.date_joined,
                score=80.0
            )

    def test_learning_material_list_baseline(self):
        start_time = time.time()
        with self.assertNumQueries(5):
            response = self.client.get("/api/quizzes/materials/")
        elapsed_ms = (time.time() - start_time) * 1000
        payload_bytes = len(response.content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print(f"MATERIALS METRICS: queries=5 time={elapsed_ms:.2f}ms size={payload_bytes}B")

    def test_quiz_list_baseline(self):
        start_time = time.time()
        with self.assertNumQueries(7):
            response = self.client.get("/api/quizzes/")
        elapsed_ms = (time.time() - start_time) * 1000
        payload_bytes = len(response.content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print(f"QUIZZES METRICS: queries=7 time={elapsed_ms:.2f}ms size={payload_bytes}B")

    def test_quiz_attempt_list_baseline(self):
        start_time = time.time()
        with self.assertNumQueries(104):
            response = self.client.get("/api/attempts/attempts/")
        elapsed_ms = (time.time() - start_time) * 1000
        payload_bytes = len(response.content)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print(f"ATTEMPTS METRICS: queries=104 time={elapsed_ms:.2f}ms size={payload_bytes}B")

    def _get_queries(self):
        from django.db import connection
        return connection.queries

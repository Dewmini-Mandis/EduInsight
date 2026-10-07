from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student
from apps.quizzes.models import AcademicTerm, Lesson, QuizLevel, DifficultyLevel, Quiz, Question, Answer, Skill, LearningMaterial, VideoQuestion
from apps.attempts.models import QuizAttempt, StudentContentProgress, StudentVideoAnswer

class MaterialTimeAndVideoValidationTestCase(TestCase):
    def setUp(self):
        self.student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)
        self.teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.school = School.objects.create(name="Material Validation School")

        self.teacher_user = User.objects.create_user(
            username="teacher_mat_val",
            email="teacher_mat@test.com",
            password="password123",
            role=self.teacher_role,
            school=self.school
        )
        self.student_user = User.objects.create_user(
            username="student_mat_val",
            email="student_mat@test.com",
            password="password123",
            role=self.student_role,
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

        self.term = AcademicTerm.objects.create(name="Term 1", order=1)
        self.lesson = Lesson.objects.create(title="Geometry Fundamentals", term=self.term)
        self.skill = Skill.objects.create(name="Perimeter & Area", lesson=self.lesson)
        self.level = QuizLevel.objects.create(name="Beginner", order=1)
        self.diff = DifficultyLevel.objects.create(name="Easy", order=1)

        self.quiz = Quiz.objects.create(
            title="Geometry Assessment",
            lesson=self.lesson,
            skill=self.skill,
            school=self.school,
            created_by=self.teacher_user,
            assigned_class=self.classroom,
            status="PUBLISHED",
            quiz_level=self.level,
            difficulty=self.diff,
            pass_mark=70,
            max_attempts=3
        )

        self.note_mat = LearningMaterial.objects.create(
            title="Perimeter Learning Note",
            material_type=LearningMaterial.TYPE_TEXT,
            content="Detailed perimeter content here...",
            estimated_completion_minutes=5,
            lesson=self.lesson,
            skill=self.skill,
            quiz=self.quiz,
            created_by=self.teacher_user
        )

        self.video_mat = LearningMaterial.objects.create(
            title="Perimeter Video Walkthrough",
            material_type=LearningMaterial.TYPE_VIDEO,
            content="https://example.com/video.mp4",
            lesson=self.lesson,
            skill=self.skill,
            quiz=self.quiz,
            created_by=self.teacher_user
        )

        self.v_q1 = VideoQuestion.objects.create(
            material=self.video_mat,
            timestamp=30.0,
            question_type=VideoQuestion.TYPE_MCQ,
            question_text="What is perimeter?",
            options=[
                {"text": "Sum of all sides", "is_correct": True},
                {"text": "Total area inside", "is_correct": False}
            ]
        )

    def test_note_material_time_restriction(self):
        """Mark as complete blocked if accumulated_seconds < estimated_completion_minutes * 60"""
        # Try marking completed immediately (0 seconds accumulated)
        res = self.client.post("/api/attempts/content-progress/", {
            "material": self.note_mat.id,
            "accumulated_seconds": 120, # 2 minutes out of 5 required
            "is_completed": True
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Please complete the required learning time", res.data["detail"])

        # Update accumulated seconds to 300 (5 minutes)
        res2 = self.client.post("/api/attempts/content-progress/", {
            "material": self.note_mat.id,
            "accumulated_seconds": 300,
            "is_completed": True
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data["is_completed"])

    def test_video_material_skipping_and_questions_validation(self):
        """Video completion blocked if unwatched or video questions unanswered"""
        # 1. Skipped video (watched 50% only)
        res = self.client.post("/api/attempts/content-progress/", {
            "material": self.video_mat.id,
            "watched_percentage": 50.0,
            "is_completed": True
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("finish watching", res.data["detail"])

        # 2. Fully watched (100%) but question unanswered
        res2 = self.client.post("/api/attempts/content-progress/", {
            "material": self.video_mat.id,
            "watched_percentage": 100.0,
            "is_completed": True
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("answer all embedded video questions", res2.data["detail"])

        # 3. Answer question
        ans_res = self.client.post("/api/attempts/video-answers/", {
            "question": self.v_q1.id,
            "selected_answer": "Sum of all sides"
        }, format="json")
        self.assertEqual(ans_res.status_code, status.HTTP_201_CREATED)

        # 4. Try marking completed again -> Success
        res3 = self.client.post("/api/attempts/content-progress/", {
            "material": self.video_mat.id,
            "watched_percentage": 100.0,
            "is_completed": True
        }, format="json")
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertTrue(res3.data["is_completed"])

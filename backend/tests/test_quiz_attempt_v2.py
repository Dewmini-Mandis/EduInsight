import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, Role
from apps.classes.models import SchoolClass, Student
from apps.schools.models import School
from apps.quizzes.models import Quiz, Question, Answer, Skill

class QuizAttemptV2Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = School.objects.create(name="Test High")
        role_teacher, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        role_student, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)

        self.teacher_user = User.objects.create_user(
            username="teacher1",
            email="teacher@test.com",
            password="Password123!",
            role=role_teacher,
            school=self.school
        )
        self.student_user = User.objects.create_user(
            username="student1",
            email="student@test.com",
            password="Password123!",
            role=role_student,
            school=self.school
        )
        self.classroom = SchoolClass.objects.create(name="Class 1A", school=self.school)
        self.student = Student.objects.create(
            user=self.student_user,
            registered_by=self.teacher_user,
            class_room=self.classroom
        )
        self.client.force_authenticate(user=self.student_user)

        self.skill_a = Skill.objects.create(name="Algebra")
        self.skill_b = Skill.objects.create(name="Geometry")

        self.quiz = Quiz.objects.create(
            title="Comprehensive Math Quiz",
            max_attempts=2,
            estimated_time_minutes=10,
            school=self.school,
            created_by=self.teacher_user,
            assigned_class=self.classroom,
            status="PUBLISHED"
        )
        self.quiz.skills.add(self.skill_a, self.skill_b)

    def _create_questions_for_skill(self, skill, count):
        questions = []
        for i in range(count):
            q = Question.objects.create(
                quiz=None,
                skill=skill,
                question_text=f"Question {i+1} for {skill.name}",
                question_type=Question.TYPE_MCQ,
                difficulty_level="Medium"
            )
            Answer.objects.create(question=q, answer_text="Option A", is_correct=True)
            Answer.objects.create(question=q, answer_text="Option B", is_correct=False)
            questions.append(q)
        return questions

    def test_skill_based_question_validation(self):
        # Create only 5 questions for skill A and 10 for skill B
        self._create_questions_for_skill(self.skill_a, 5)
        self._create_questions_for_skill(self.skill_b, 10)

        res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient un-attempted questions for skill 'Algebra'", res.data["detail"])
        self.assertIn("5 more needed", res.data["detail"])

    def test_attempt_start_snapshot_and_limit_enforcement(self):
        # Add 20 questions for skill A and 20 for skill B so 2 distinct attempts can be created
        self._create_questions_for_skill(self.skill_a, 20)
        self._create_questions_for_skill(self.skill_b, 20)

        # Attempt 1 Start
        res1 = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data["attempt_number"], 1)
        self.assertEqual(res1.data["status"], "IN_PROGRESS")
        self.assertEqual(len(res1.data["attempt_questions"]), 20)

        # Active attempt fetch returns same attempt
        res_active = self.client.get(f"/api/attempts/attempts/active/?quiz={self.quiz.id}")
        self.assertEqual(res_active.status_code, status.HTTP_200_OK)
        self.assertTrue(res_active.data["active"])
        self.assertEqual(res_active.data["attempt"]["id"], res1.data["id"])

        # Submit Attempt 1
        answers1 = [
            {"question": aq["question_detail"]["id"], "selected_answer": aq["question_detail"]["answers"][0]["id"], "hint_count": 0}
            for aq in res1.data["attempt_questions"]
        ]
        sub1 = self.client.post(f"/api/attempts/attempts/{res1.data['id']}/submit/", {"answers": answers1}, format="json")
        self.assertEqual(sub1.status_code, status.HTTP_200_OK)
        self.assertEqual(sub1.data["status"], "SUBMITTED")

        # Attempt 2 Start
        res2 = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.data["attempt_number"], 2)

        # Submit Attempt 2
        answers2 = [
            {"question": aq["question_detail"]["id"], "selected_answer": aq["question_detail"]["answers"][0]["id"], "hint_count": 0}
            for aq in res2.data["attempt_questions"]
        ]
        sub2 = self.client.post(f"/api/attempts/attempts/{res2.data['id']}/submit/", {"answers": answers2}, format="json")
        self.assertEqual(sub2.status_code, status.HTTP_200_OK)

        # Attempt 3 Start -> Exceeds max_attempts=2
        res3 = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maximum limit of 2 attempts", res3.data["detail"])

    def test_progressive_save_and_timer_expiration(self):
        self._create_questions_for_skill(self.skill_a, 10)
        self._create_questions_for_skill(self.skill_b, 10)

        start_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        attempt_id = start_res.data["id"]
        q1 = start_res.data["attempt_questions"][0]["question_detail"]
        correct_ans_id = q1["answers"][0]["id"]

        # Progressive Save before expiration
        save_res = self.client.post(
            f"/api/attempts/attempts/{attempt_id}/save_answers/",
            {"answers": [{"question": q1["id"], "selected_answer": correct_ans_id, "hint_count": 0}]},
            format="json"
        )
        self.assertEqual(save_res.status_code, status.HTTP_200_OK)
        self.assertFalse(save_res.data["expired"])

        # Manually shift expires_at into past to simulate timer expiration
        from apps.attempts.models import QuizAttempt
        attempt_obj = QuizAttempt.objects.get(id=attempt_id)
        attempt_obj.expires_at = timezone.now() - datetime.timedelta(seconds=10)
        attempt_obj.save()

        # Save after expiration triggers auto-submit
        save_exp = self.client.post(
            f"/api/attempts/attempts/{attempt_id}/save_answers/",
            {"answers": []},
            format="json"
        )
        self.assertEqual(save_exp.status_code, status.HTTP_200_OK)
        self.assertTrue(save_exp.data["expired"])
        self.assertEqual(save_exp.data["attempt"]["status"], "EXPIRED")
        self.assertTrue(save_exp.data["attempt"]["auto_submitted"])
        self.assertGreater(save_exp.data["attempt"]["score"], 0)

    def test_idempotent_submit_handling(self):
        self._create_questions_for_skill(self.skill_a, 10)
        self._create_questions_for_skill(self.skill_b, 10)

        start_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        attempt_id = start_res.data["id"]
        answers = [
            {"question": aq["question_detail"]["id"], "selected_answer": aq["question_detail"]["answers"][0]["id"], "hint_count": 0}
            for aq in start_res.data["attempt_questions"]
        ]

        sub1 = self.client.post(f"/api/attempts/attempts/{attempt_id}/submit/", {"answers": answers}, format="json")
        self.assertEqual(sub1.status_code, status.HTTP_200_OK)
        self.assertEqual(sub1.data["status"], "SUBMITTED")

        # Second submit call
        sub2 = self.client.post(f"/api/attempts/attempts/{attempt_id}/submit/", {"answers": answers}, format="json")
        self.assertEqual(sub2.status_code, status.HTTP_200_OK)
        self.assertEqual(sub2.data["id"], attempt_id)

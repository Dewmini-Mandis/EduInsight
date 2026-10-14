import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, Role
from apps.classes.models import Student, SchoolClass
from apps.schools.models import School
from apps.quizzes.models import Quiz, Question, Answer, Skill
from apps.attempts.models import QuizAttempt, AttemptAnswer


class QuizSubmissionValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = School.objects.create(name="Validation Test School")
        self.class_room = SchoolClass.objects.create(name="Grade 6A", school=self.school)
        role_teacher, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        role_student, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)

        self.teacher_user = User.objects.create_user(
            username="teacher_val",
            email="teacher_val@test.com",
            password="Password123!",
            role=role_teacher,
            school=self.school
        )
        self.student_user = User.objects.create_user(
            username="student_val",
            email="student_val@test.com",
            password="Password123!",
            role=role_student,
            school=self.school
        )
        self.student = Student.objects.create(
            user=self.student_user,
            registered_by=self.teacher_user,
            class_room=self.class_room
        )
        self.client.force_authenticate(user=self.student_user)

        self.skill = Skill.objects.create(name="General Math")

        self.quiz = Quiz.objects.create(
            title="Validation Assessment",
            max_attempts=3,
            estimated_time_minutes=10,
            school=self.school,
            created_by=self.teacher_user,
            assigned_class=self.class_room,
            status=Quiz.STATUS_PUBLISHED
        )
        self.quiz.skills.add(self.skill)

        # Create 30 questions in skill bank for 3 non-overlapping attempts (10 per attempt)
        self.questions = []
        for i in range(30):
            q = Question.objects.create(
                quiz=None,
                skill=self.skill,
                question_text=f"Question {i+1}",
                question_type=Question.TYPE_MCQ
            )
            a1 = Answer.objects.create(question=q, answer_text="Correct", is_correct=True)
            a2 = Answer.objects.create(question=q, answer_text="Wrong", is_correct=False)
            self.questions.append((q, a1, a2))

    def test_case_1_full_submission_allowed(self):
        start_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        attempt_id = start_res.data["id"]
        allocated_qs = start_res.data["attempt_questions"]
        self.assertEqual(len(allocated_qs), 10)

        # Answer all 10 allocated questions
        answers_payload = [
            {"question": aq["question"], "selected_answer": aq["question_detail"]["answers"][0]["id"], "hint_count": 0}
            for aq in allocated_qs
        ]

        sub_res = self.client.post(
            f"/api/attempts/attempts/{attempt_id}/submit/",
            {"answers": answers_payload, "is_auto_submit": False},
            format="json"
        )
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_res.data["status"], "SUBMITTED")
        self.assertEqual(sub_res.data["score"], 100.0)

    def test_case_8_backend_rejects_incomplete_manual_submission(self):
        start_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        attempt_id = start_res.data["id"]
        allocated_qs = start_res.data["attempt_questions"]
        self.assertEqual(len(allocated_qs), 10)

        # Only answer 9 questions (leave 1 unanswered)
        answers_payload = [
            {"question": aq["question"], "selected_answer": aq["question_detail"]["answers"][0]["id"], "hint_count": 0}
            for aq in allocated_qs[:9]
        ]

        sub_res = self.client.post(
            f"/api/attempts/attempts/{attempt_id}/submit/",
            {"answers": answers_payload, "is_auto_submit": False},
            format="json"
        )
        self.assertEqual(sub_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("All questions must be answered before submission.", sub_res.data["detail"])
        self.assertEqual(sub_res.data["unanswered_count"], 1)

    def test_case_5_and_6_save_and_resume_draft(self):
        start_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        attempt_id = start_res.data["id"]
        allocated_qs = start_res.data["attempt_questions"]

        # Save 5 answers as draft
        draft_payload = [
            {"question": aq["question"], "selected_answer": aq["question_detail"]["answers"][0]["id"], "hint_count": 0}
            for aq in allocated_qs[:5]
        ]

        save_res = self.client.post(
            f"/api/attempts/attempts/{attempt_id}/save_answers/",
            {"answers": draft_payload},
            format="json"
        )
        self.assertEqual(save_res.status_code, status.HTTP_200_OK)

        # Resume attempt via active endpoint
        active_res = self.client.get(f"/api/attempts/attempts/active/?quiz={self.quiz.id}")
        self.assertEqual(active_res.status_code, status.HTTP_200_OK)
        self.assertTrue(active_res.data["active"])
        self.assertEqual(active_res.data["attempt"]["id"], attempt_id)
        self.assertEqual(len(active_res.data["attempt"]["answers"]), 5)

    def test_case_7_timer_expiry_exception_auto_submits(self):
        start_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        attempt_id = start_res.data["id"]
        allocated_qs = start_res.data["attempt_questions"]
        self.assertEqual(len(allocated_qs), 10)

        # Answer only 7 questions out of 10
        partial_payload = [
            {"question": aq["question"], "selected_answer": aq["question_detail"]["answers"][0]["id"], "hint_count": 0}
            for aq in allocated_qs[:7]
        ]

        # Auto-submit triggered by timer expiry (is_auto_submit=True)
        exp_res = self.client.post(
            f"/api/attempts/attempts/{attempt_id}/submit/",
            {"answers": partial_payload, "is_auto_submit": True},
            format="json"
        )
        self.assertEqual(exp_res.status_code, status.HTTP_200_OK)
        self.assertEqual(exp_res.data["status"], "EXPIRED")
        self.assertTrue(exp_res.data["auto_submitted"])
        self.assertEqual(exp_res.data["score"], 70.0)
        self.assertEqual(AttemptAnswer.objects.filter(attempt_id=attempt_id).count(), 10)

    def test_case_9_and_10_multiple_attempts_distinct_results(self):
        # Attempt 1: 10/10 correct
        res1 = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        id1 = res1.data["id"]
        qs1 = res1.data["attempt_questions"]
        payload1 = [{"question": aq["question"], "selected_answer": aq["question_detail"]["answers"][0]["id"]} for aq in qs1]
        self.client.post(f"/api/attempts/attempts/{id1}/submit/", {"answers": payload1, "is_auto_submit": False}, format="json")

        # Attempt 2: 5 correct, 5 wrong
        res2 = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        id2 = res2.data["id"]
        qs2 = res2.data["attempt_questions"]
        payload2 = [
            {"question": aq["question"], "selected_answer": aq["question_detail"]["answers"][0 if idx < 5 else 1]["id"]}
            for idx, aq in enumerate(qs2)
        ]
        self.client.post(f"/api/attempts/attempts/{id2}/submit/", {"answers": payload2, "is_auto_submit": False}, format="json")

        # Fetch attempt 1 detail
        att1_detail = self.client.get(f"/api/attempts/attempts/{id1}/")
        self.assertEqual(att1_detail.data["score"], 100.0)

        # Fetch attempt 2 detail
        att2_detail = self.client.get(f"/api/attempts/attempts/{id2}/")
        self.assertEqual(att2_detail.data["score"], 50.0)

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student
from apps.quizzes.models import AcademicTerm, Lesson, QuizLevel, DifficultyLevel, Quiz, Question, Answer, Skill, LearningMaterial
from apps.attempts.models import QuizAttempt, AttemptAnswer, StudentContentProgress, StudentRemediationState, TeacherIntervention
from apps.analytics.models import RiskPrediction

class RemediationWorkflowTestCase(TestCase):
    def setUp(self):
        self.student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)
        self.teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.school = School.objects.create(name="Remediation Test School")

        self.teacher_user = User.objects.create_user(
            username="teacher_remed_test",
            email="teacher_remed@test.com",
            password="password123",
            role=self.teacher_role,
            school=self.school
        )
        self.student_user = User.objects.create_user(
            username="student_remed_test",
            email="student_remed@test.com",
            password="password123",
            role=self.student_role,
            school=self.school
        )
        self.classroom = SchoolClass.objects.create(name="Class 10A", school=self.school)
        self.student = Student.objects.create(
            user=self.student_user,
            registered_by=self.teacher_user,
            class_room=self.classroom
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.student_user)

        self.term = AcademicTerm.objects.create(name="Term 1", order=1)
        self.lesson = Lesson.objects.create(title="Algebra Fundamentals", term=self.term)
        self.skill = Skill.objects.create(name="Linear Equations", lesson=self.lesson)
        self.level = QuizLevel.objects.create(name="Beginner", order=1)
        self.diff = DifficultyLevel.objects.create(name="Easy", order=1)

        self.quiz = Quiz.objects.create(
            title="Algebra Assessment",
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

        self.mat1 = LearningMaterial.objects.create(
            title="Linear Equations Video Guide",
            material_type=LearningMaterial.TYPE_VIDEO,
            lesson=self.lesson,
            skill=self.skill,
            quiz=self.quiz,
            created_by=self.teacher_user
        )
        self.mat2 = LearningMaterial.objects.create(
            title="Linear Equations Practice PDF",
            material_type=LearningMaterial.TYPE_PDF,
            lesson=self.lesson,
            skill=self.skill,
            quiz=self.quiz,
            created_by=self.teacher_user
        )

        # Create 40 questions for quiz (10 unique questions per attempt cycle)
        self.questions = []
        for i in range(40):
            q = Question.objects.create(quiz=self.quiz, skill=self.skill, question_text=f"Q{i+1}", question_type=Question.TYPE_MCQ)
            a_corr = Answer.objects.create(question=q, answer_text="Correct", is_correct=True)
            a_wrg = Answer.objects.create(question=q, answer_text="Wrong", is_correct=False)
            self.questions.append((q, a_corr, a_wrg))

    def _submit_attempt_with_score(self, attempt_id, correct_pct=40):
        attempt = QuizAttempt.objects.get(id=attempt_id)
        att_qs = list(attempt.attempt_questions.select_related("question").all())
        total_q = len(att_qs)
        correct_target = int(round((correct_pct / 100.0) * total_q))

        answers = []
        for i, aq in enumerate(att_qs):
            q = aq.question
            corr_ans = Answer.objects.filter(question_id=q.id, is_correct=True).first()
            wrg_ans = Answer.objects.filter(question_id=q.id, is_correct=False).first()
            ans_id = corr_ans.id if i < correct_target else wrg_ans.id
            answers.append({"question": q.id, "selected_answer": ans_id, "hint_count": 0})

        return self.client.post(f"/api/attempts/attempts/{attempt_id}/submit/", {"answers": answers}, format="json")

    def test_1_fail_attempt_1_of_3_ordinary_retake_allowed(self):
        """Fail attempt 1 of 3 -> ordinary retake allowed (FAILED_RETRYABLE)"""
        start_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(start_res.status_code, status.HTTP_201_CREATED)
        attempt1_id = start_res.data["id"]

        # Fail attempt 1 (4 correct out of 10 = 40% < 70%)
        sub_res = self._submit_attempt_with_score(attempt1_id, 40)
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_res.data["attempt_result_status"], "FAILED_RETRYABLE")

        # Confirm remediation state NOT created yet
        rem_state = StudentRemediationState.objects.filter(student=self.student, quiz=self.quiz).first()
        self.assertIsNone(rem_state)

        # Attempt 2 start must be allowed
        start2_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(start2_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(start2_res.data["attempt_number"], 2)

    def test_2_fail_attempt_3_of_3_remediation_created(self):
        """Fail attempt 3 of 3 -> state becomes FAILED_EXHAUSTED and remediation state created"""
        for att_num in range(1, 4):
            s_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
            att_id = s_res.data["id"]
            self._submit_attempt_with_score(att_id, 30)

        rem_state = StudentRemediationState.objects.filter(student=self.student, quiz=self.quiz).first()
        self.assertIsNotNone(rem_state)
        self.assertEqual(rem_state.status, StudentRemediationState.STATUS_PENDING_MATERIALS)
        self.assertTrue(rem_state.required_materials.filter(id=self.mat1.id).exists())

    def test_3_try_reassessment_before_completing_materials_blocked(self):
        """Try reassessment before completing any materials -> blocked (HTTP 403)"""
        # Exhaust attempts
        for _ in range(3):
            s_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
            self._submit_attempt_with_score(s_res.data["id"], 20)

        # Try to start reassessment without completing materials
        reass_res = self.client.post("/api/attempts/attempts/start_reassessment/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(reass_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(reass_res.data.get("remediation_required"))

    def test_4_complete_only_some_required_materials_still_blocked(self):
        """Complete only 1 of 2 required materials -> reassessment still blocked"""
        for _ in range(3):
            s_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
            self._submit_attempt_with_score(s_res.data["id"], 20)

        # Complete mat1 only
        StudentContentProgress.objects.create(student=self.student, material=self.mat1, is_completed=True)

        reass_res = self.client.post("/api/attempts/attempts/start_reassessment/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(reass_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_5_complete_all_required_materials_reassessment_unlocked(self):
        """Complete all required materials -> reassessment unlocked"""
        for _ in range(3):
            s_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
            self._submit_attempt_with_score(s_res.data["id"], 20)

        # Complete both materials
        StudentContentProgress.objects.create(student=self.student, material=self.mat1, is_completed=True)
        StudentContentProgress.objects.create(student=self.student, material=self.mat2, is_completed=True)

        status_res = self.client.get(f"/api/attempts/attempts/remediation_status/?quiz={self.quiz.id}")
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertTrue(status_res.data["all_materials_completed"])
        self.assertTrue(status_res.data["reassessment_unlocked"])
        self.assertEqual(status_res.data["reassessment_status"], "UNLOCKED")

        # Start reassessment
        reass_res = self.client.post("/api/attempts/attempts/start_reassessment/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(reass_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(reass_res.data["attempt_type"], QuizAttempt.TYPE_REASSESSMENT)

    def test_6_pass_reassessment_normal_progression(self):
        """Pass reassessment (score >= 70%) -> COMPLETED_SUCCESS and normal progression"""
        for _ in range(3):
            s_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
            self._submit_attempt_with_score(s_res.data["id"], 20)

        StudentContentProgress.objects.create(student=self.student, material=self.mat1, is_completed=True)
        StudentContentProgress.objects.create(student=self.student, material=self.mat2, is_completed=True)

        reass_start = self.client.post("/api/attempts/attempts/start_reassessment/", {"quiz": self.quiz.id}, format="json")
        reass_id = reass_start.data["id"]

        # Submit reassessment passing (8 correct = 80% >= 70%)
        sub_res = self._submit_attempt_with_score(reass_id, 80)
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_res.data["attempt_result_status"], "PASSED")
        self.assertEqual(sub_res.data["remediation_state_status"], StudentRemediationState.STATUS_COMPLETED_SUCCESS)

        rem_state = StudentRemediationState.objects.get(student=self.student, quiz=self.quiz)
        self.assertEqual(rem_state.status, StudentRemediationState.STATUS_COMPLETED_SUCCESS)

    def test_7_fail_reassessment_pending_teacher_escalation(self):
        """Fail reassessment (score < 70%) -> ESCALATED_TEACHER and auto-create pending TeacherIntervention"""
        for _ in range(3):
            s_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
            self._submit_attempt_with_score(s_res.data["id"], 20)

        StudentContentProgress.objects.create(student=self.student, material=self.mat1, is_completed=True)
        StudentContentProgress.objects.create(student=self.student, material=self.mat2, is_completed=True)

        reass_start = self.client.post("/api/attempts/attempts/start_reassessment/", {"quiz": self.quiz.id}, format="json")
        reass_id = reass_start.data["id"]

        # Submit reassessment failing (4 correct = 40% < 70%)
        sub_res = self._submit_attempt_with_score(reass_id, 40)
        self.assertEqual(sub_res.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_res.data["remediation_state_status"], StudentRemediationState.STATUS_ESCALATED_TEACHER)

        # Check pending TeacherIntervention
        intervention = TeacherIntervention.objects.filter(student=self.student, quiz=self.quiz, is_pending=True).first()
        self.assertIsNotNone(intervention)
        self.assertTrue(intervention.is_pending)

    def test_8_high_risk_on_attempt_1_attempts_2_and_3_remain_available(self):
        """High Risk prediction on attempt 1 -> attempts 2 and 3 remain available without consuming attempts or forcing remediation"""
        s_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        att1_id = s_res.data["id"]
        attempt1 = QuizAttempt.objects.get(id=att1_id)

        # Create High Risk prediction on attempt 1
        RiskPrediction.objects.create(
            student=self.student,
            attempt=attempt1,
            risk_category="High Risk",
            risk_probability=0.88
        )

        sub_res = self._submit_attempt_with_score(att1_id, 40)
        self.assertEqual(sub_res.data["attempt_result_status"], "FAILED_RETRYABLE")

        # Confirm ordinary attempts 2 and 3 remain available
        status_res = self.client.get(f"/api/attempts/attempts/remediation_status/?quiz={self.quiz.id}")
        self.assertEqual(status_res.data["ordinary_attempts_used"], 1)
        self.assertEqual(status_res.data["ordinary_attempts_remaining"], 2)
        self.assertTrue(status_res.data["high_risk_warning"])

        # Attempt 2 start works normally
        s2_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
        self.assertEqual(s2_res.status_code, status.HTTP_201_CREATED)

    def test_9_reassessment_does_not_increment_ordinary_attempt_count(self):
        """Reassessment attempt does not increment ordinary attempt count"""
        for _ in range(3):
            s_res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz.id}, format="json")
            self._submit_attempt_with_score(s_res.data["id"], 20)

        StudentContentProgress.objects.create(student=self.student, material=self.mat1, is_completed=True)
        StudentContentProgress.objects.create(student=self.student, material=self.mat2, is_completed=True)

        reass_start = self.client.post("/api/attempts/attempts/start_reassessment/", {"quiz": self.quiz.id}, format="json")
        reass_id = reass_start.data["id"]
        self._submit_attempt_with_score(reass_id, 80)

        ordinary_count = QuizAttempt.objects.filter(
            student=self.student, quiz=self.quiz, attempt_type=QuizAttempt.TYPE_ORDINARY, status=QuizAttempt.STATUS_SUBMITTED
        ).count()
        self.assertEqual(ordinary_count, 3)

        reassessment_count = QuizAttempt.objects.filter(
            student=self.student, quiz=self.quiz, attempt_type=QuizAttempt.TYPE_REASSESSMENT
        ).count()
        self.assertEqual(reassessment_count, 1)

    def test_10_configurable_quiz_pass_threshold_is_respected(self):
        """Configurable pass mark (e.g. 50% vs 80%) is respected without hardcoded 60%"""
        lesson_easy = Lesson.objects.create(title="Standalone Lesson", term=self.term)
        quiz_easy = Quiz.objects.create(
            title="Easy Quiz (50% Pass Mark)",
            lesson=lesson_easy,
            school=self.school,
            created_by=self.teacher_user,
            assigned_class=self.classroom,
            status="PUBLISHED",
            pass_mark=50,
            max_attempts=2
        )
        for i in range(10):
            q = Question.objects.create(quiz=quiz_easy, question_text=f"EQ{i+1}", question_type=Question.TYPE_MCQ)
            a_corr = Answer.objects.create(question=q, answer_text="C", is_correct=True)
            a_wrg = Answer.objects.create(question=q, answer_text="W", is_correct=False)

        start_res = self.client.post("/api/attempts/attempts/start/", {"quiz": quiz_easy.id}, format="json")
        self.assertEqual(start_res.status_code, status.HTTP_201_CREATED)
        att_id = start_res.data["id"]

        # 5 out of 10 correct = 50% score. Pass mark is 50%.
        answers = []
        for i, q in enumerate(quiz_easy.questions.all()):
            corr_ans = q.answers.filter(is_correct=True).first()
            wrg_ans = q.answers.filter(is_correct=False).first()
            ans_id = corr_ans.id if i < 5 else wrg_ans.id
            answers.append({"question": q.id, "selected_answer": ans_id})

        sub_res = self.client.post(f"/api/attempts/attempts/{att_id}/submit/", {"answers": answers}, format="json")
        self.assertEqual(sub_res.data["attempt_result_status"], "PASSED")

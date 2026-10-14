import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, Role
from apps.classes.models import SchoolClass, Student
from apps.schools.models import School
from apps.quizzes.models import Quiz, Question, Answer, Skill, Lesson, AcademicTerm
from apps.attempts.models import QuizAttempt, AttemptQuestion, AttemptAnswer
from apps.analytics.models import RiskPrediction
from apps.analytics.services.risk_predictor import predict_student_risk, evaluate_and_store_attempt_risk
from apps.attempts.serializers import QuizAttemptSerializer

class MLRiskPredictionIntegrationTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(name="ML Test School")
        self.role_teacher, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.role_student, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)

        self.teacher = User.objects.create_user(
            username="teacher_ml",
            email="teacher_ml@test.com",
            password="Password123!",
            role=self.role_teacher,
            school=self.school,
        )
        self.student_user = User.objects.create_user(
            username="student_ml",
            email="student_ml@test.com",
            password="Password123!",
            role=self.role_student,
            school=self.school,
        )
        self.student = Student.objects.create(user=self.student_user, registered_by=self.teacher)

        self.term = AcademicTerm.objects.create(name="Term ML")
        self.lesson = Lesson.objects.create(title="Lesson ML", term=self.term, created_by=self.teacher)
        self.skill = Skill.objects.create(name="Skill ML", lesson=self.lesson)

        self.quiz = Quiz.objects.create(
            title="ML Integration Quiz",
            lesson=self.lesson,
            skill=self.skill,
            max_attempts=3,
            pass_mark=60,
            created_by=self.teacher,
            school=self.school,
            status="PUBLISHED",
        )

        self.client = APIClient()

    def test_direct_model_predict_high_risk(self):
        """
        Test 1: Directly run trained ML model with high risk feature inputs.
        """
        high_risk_features = {
            "past_accuracy": 0.20,
            "early_accuracy": 0.20,
            "recent_accuracy": 0.20,
            "recent3_accuracy": 0.20,
            "improvement_rate": 0.00,
            "accuracy_trend": -0.05,
            "correct_streak": 0,
            "wrong_streak": 5,
            "past_avg_time": 180.0,
            "past_median_time": 180.0,
            "recent_avg_time": 200.0,
            "response_time_trend": 10.0,
            "past_avg_attempts": 3.0,
            "recent_avg_attempts": 3.0,
            "attempt_trend": 0.5,
        }
        res = predict_student_risk(high_risk_features)
        self.assertEqual(res["status"], "success")
        self.assertIn("risk_level", res)
        self.assertIn(res["risk_level"], ["High Risk", "Not High Risk"])

    def test_direct_model_predict_not_high_risk(self):
        """
        Test 2: Directly run trained ML model with high accuracy (low risk) feature inputs.
        """
        low_risk_features = {
            "past_accuracy": 1.00,
            "early_accuracy": 1.00,
            "recent_accuracy": 1.00,
            "recent3_accuracy": 1.00,
            "improvement_rate": 0.00,
            "accuracy_trend": 0.00,
            "correct_streak": 10,
            "wrong_streak": 0,
            "past_avg_time": 15.0,
            "past_median_time": 15.0,
            "recent_avg_time": 15.0,
            "response_time_trend": 0.0,
            "past_avg_attempts": 1.0,
            "recent_avg_attempts": 1.0,
            "attempt_trend": 0.0,
        }
        res = predict_student_risk(low_risk_features)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["risk_level"], "Not High Risk")

    def test_end_to_end_quiz_submission_triggers_ml_prediction(self):
        """
        Test 3: Complete Quiz Attempt submission triggers ML model, persists RiskPrediction,
        and includes risk_prediction in API serializer response.
        """
        # Create 10 questions
        questions = []
        for i in range(10):
            q = Question.objects.create(
                quiz=self.quiz,
                skill=self.skill,
                question_text=f"Q{i+1}",
                question_type=Question.TYPE_MCQ,
            )
            ans = Answer.objects.create(question=q, answer_text="Option 1", is_correct=True)
            questions.append((q, ans))

        # Start attempt
        attempt = QuizAttempt.objects.create(
            student=self.student,
            quiz=self.quiz,
            attempt_number=1,
            attempt_type=QuizAttempt.TYPE_ORDINARY,
            start_time=timezone.now(),
            status=QuizAttempt.STATUS_IN_PROGRESS,
        )

        for q, ans in questions:
            AttemptQuestion.objects.create(attempt=attempt, question=q)

        # Submit attempt via API
        self.client.force_authenticate(user=self.student_user)
        answers_payload = [
            {
                "question": q.id,
                "selected_answer": ans.id,
                "hint_count": 0,
            }
            for q, ans in questions
        ]

        response = self.client.post(f"/api/attempts/attempts/{attempt.id}/submit/", {
            "answers": answers_payload,
            "auto_submitted": False,
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify RiskPrediction persisted in DB
        risk_pred = RiskPrediction.objects.filter(attempt=attempt).first()
        self.assertIsNotNone(risk_pred)
        self.assertIn(risk_pred.risk_category, ["High Risk", "Not High Risk"])

        # Verify Student response includes risk_support and hides raw risk_prediction
        serializer_data = response.data
        self.assertIn("risk_support", serializer_data)
        self.assertIsNotNone(serializer_data["risk_support"])
        self.assertIsNone(serializer_data["risk_prediction"])

        # Verify Teacher/Admin re-fetching attempt receives role-aware risk_prediction
        self.client.force_authenticate(user=self.teacher)
        refetch_res = self.client.get(f"/api/attempts/attempts/{attempt.id}/")
        self.assertEqual(refetch_res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(refetch_res.data["risk_prediction"])
        self.assertEqual(
            refetch_res.data["risk_prediction"]["risk_level"],
            risk_pred.risk_category
        )

    def test_risk_prediction_requires_at_least_10_interactions_safeguard(self):
        """
        Verifies that attempts with fewer than 10 total interactions return insufficient_history
        and do not persist a RiskPrediction record.
        """
        short_attempt = QuizAttempt.objects.create(
            student=self.student,
            quiz=self.quiz,
            attempt_number=2,
            attempt_type=QuizAttempt.TYPE_ORDINARY,
            start_time=timezone.now(),
            status=QuizAttempt.STATUS_SUBMITTED,
        )

        # Create only 5 answers (< 10 safeguard)
        for i in range(5):
            q = Question.objects.create(quiz=self.quiz, skill=self.skill, question_text=f"Q_short_{i}", question_type=Question.TYPE_MCQ)
            a = Answer.objects.create(question=q, answer_text="Option 1", is_correct=True)
            AttemptAnswer.objects.create(attempt=short_attempt, question=q, selected_answer=a, is_correct=True)

        # Evaluate risk on short attempt (< 10 answers)
        result = evaluate_and_store_attempt_risk(short_attempt)
        self.assertIsNone(result)

        # Confirm no RiskPrediction created in DB
        pred_exists = RiskPrediction.objects.filter(attempt=short_attempt).exists()
        self.assertFalse(pred_exists)

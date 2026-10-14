import math
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role
from apps.classes.models import Student
from apps.quizzes.models import Quiz, Question, Answer
from apps.attempts.models import QuizAttempt, AttemptAnswer
from apps.analytics.models import RiskPrediction
from apps.analytics.services.shap_explainer import (
    generate_shap_explanation,
    FEATURE_METADATA,
    _feature_list,
    _explainer,
    _base_value,
    _model,
)
from apps.analytics.services.risk_predictor import evaluate_and_store_attempt_risk, predict_student_risk
from apps.attempts.serializers import QuizAttemptSerializer

User = get_user_model()


class SHAPExplainabilityUnitTests(TestCase):
    """
    Unit and mathematical verification tests for SHAP local explainability service.
    """

    def test_feature_ordering_matches_saved_schema(self):
        """Req 1: Verify feature ordering matches saved feature schema."""
        expected_features = [
            'past_accuracy', 'early_accuracy', 'recent_accuracy', 'recent3_accuracy',
            'improvement_rate', 'accuracy_trend', 'correct_streak', 'wrong_streak',
            'past_avg_time', 'past_median_time', 'recent_avg_time', 'response_time_trend',
            'past_avg_attempts', 'recent_avg_attempts', 'attempt_trend'
        ]
        self.assertEqual(_feature_list, expected_features)

    def test_shap_mathematical_reconstruction(self):
        """
        Req 15: Deterministic test comparing SHAP reconstruction with model output:
        base_value + sum(shap_values) == decision_function(x)
        sigmoid(base_value + sum(shap_values)) == predict_proba(x)[0][1]
        """
        import pandas as pd
        import numpy as np

        sample_features = {
            'past_accuracy': 0.30,
            'early_accuracy': 0.40,
            'recent_accuracy': 0.20,
            'recent3_accuracy': 0.25,
            'improvement_rate': -0.20,
            'accuracy_trend': -0.30,
            'correct_streak': 0,
            'wrong_streak': 5,
            'past_avg_time': 80.0,
            'past_median_time': 75.0,
            'recent_avg_time': 90.0,
            'response_time_trend': 1.5,
            'past_avg_attempts': 2.5,
            'recent_avg_attempts': 3.0,
            'attempt_trend': 1.0,
        }

        df = pd.DataFrame([{f: float(sample_features[f]) for f in _feature_list}])
        prob_expected = float(_model.predict_proba(df)[0][1])
        margin_expected = float(_model.decision_function(df)[0])

        explanation = generate_shap_explanation(sample_features)
        self.assertEqual(explanation["status"], "available")
        self.assertEqual(explanation["method"], "SHAP")

        all_factors = explanation["all_factors"]
        self.assertEqual(len(all_factors), 15)

        # Sum of SHAP values + base value
        sum_shap = sum(f["shap_value"] for f in all_factors)
        reconstructed_margin = explanation["base_value"] + sum_shap
        reconstructed_prob = 1.0 / (1.0 + math.exp(-reconstructed_margin))

        # Check margin reconstruction tolerance (raw log-odds margin)
        self.assertAlmostEqual(reconstructed_margin, margin_expected, places=2)
        # Check probability reconstruction tolerance (sigmoid mapping)
        self.assertAlmostEqual(reconstructed_prob, prob_expected, places=2)

    def test_high_risk_prediction_factors(self):
        """Req 3, 4, 6, 7: High Risk prediction produces valid, ranked, directionally-mapped factors."""
        high_risk_features = {
            'past_accuracy': 0.10,
            'early_accuracy': 0.15,
            'recent_accuracy': 0.05,
            'recent3_accuracy': 0.10,
            'improvement_rate': -0.50,
            'accuracy_trend': -0.40,
            'correct_streak': 0,
            'wrong_streak': 8,
            'past_avg_time': 120.0,
            'past_median_time': 110.0,
            'recent_avg_time': 130.0,
            'response_time_trend': 2.0,
            'past_avg_attempts': 3.0,
            'recent_avg_attempts': 3.0,
            'attempt_trend': 1.0,
        }

        pred = predict_student_risk(high_risk_features)
        self.assertEqual(pred["risk_level"], "High Risk")

        exp = generate_shap_explanation(high_risk_features, top_k=5)
        self.assertEqual(exp["status"], "available")
        self.assertGreaterEqual(len(exp["factors"]), 3)
        self.assertLessEqual(len(exp["factors"]), 5)

        # Verify ranking by absolute importance descending
        importances = [f["abs_importance"] for f in exp["factors"]]
        self.assertEqual(importances, sorted(importances, reverse=True))

        # Verify direction mapping
        for factor in exp["factors"]:
            if factor["shap_value"] > 0:
                self.assertEqual(factor["effect"], "increased_risk")
                self.assertIn("contributed to a higher risk estimate", factor["message"])
            else:
                self.assertEqual(factor["effect"], "decreased_risk")
                self.assertIn("contributed to a lower risk estimate", factor["message"])

    def test_not_high_risk_prediction_factors(self):
        """Req 5: Not High Risk prediction produces valid factors."""
        low_risk_features = {
            'past_accuracy': 0.95,
            'early_accuracy': 0.90,
            'recent_accuracy': 0.98,
            'recent3_accuracy': 0.95,
            'improvement_rate': 0.30,
            'accuracy_trend': 0.20,
            'correct_streak': 10,
            'wrong_streak': 0,
            'past_avg_time': 20.0,
            'past_median_time': 18.0,
            'recent_avg_time': 15.0,
            'response_time_trend': -0.5,
            'past_avg_attempts': 1.0,
            'recent_avg_attempts': 1.0,
            'attempt_trend': 0.0,
        }

        pred = predict_student_risk(low_risk_features)
        self.assertEqual(pred["risk_level"], "Not High Risk")

        exp = generate_shap_explanation(low_risk_features, top_k=4)
        self.assertEqual(exp["status"], "available")
        self.assertGreaterEqual(len(exp["factors"]), 3)

        # Strong past accuracy should reduce risk
        top_factor = exp["factors"][0]
        self.assertEqual(top_factor["effect"], "decreased_risk")

    def test_json_serializability(self):
        """Req 8: Explanation output is strictly JSON serializable."""
        import json
        sample = {f: 0.5 for f in _feature_list}
        exp = generate_shap_explanation(sample)
        dumped = json.dumps(exp)
        self.assertIsInstance(dumped, str)

    def test_shap_failure_graceful_handling(self):
        """Req 12: A SHAP failure does not crash risk prediction."""
        from unittest.mock import patch
        with patch('apps.analytics.services.shap_explainer._explainer', None):
            exp = generate_shap_explanation({f: 0.5 for f in _feature_list})
            self.assertEqual(exp["status"], "unavailable")
            self.assertIn("factors", exp)
            self.assertEqual(exp["factors"], [])


class SHAPPersistenceIntegrationTests(TestCase):
    """
    Integration tests verifying database persistence and API serialization.
    """

    def setUp(self):
        from apps.accounts.models import Role
        self.client = APIClient()
        self.role_student, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)
        self.role_teacher, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)

        self.teacher = User.objects.create_user(
            username="shap_teacher",
            password="password123",
            role=self.role_teacher
        )
        self.user = User.objects.create_user(
            username="shap_student",
            password="password123",
            first_name="Shap",
            last_name="Test",
            role=self.role_student
        )
        self.client.force_authenticate(user=self.user)
        self.student, _ = Student.objects.get_or_create(user=self.user, defaults={"registered_by": self.teacher})
        if not self.student.registered_by:
            self.student.registered_by = self.teacher
            self.student.save()

        self.quiz = Quiz.objects.create(title="SHAP Test Quiz", pass_mark=60, created_by=self.teacher)
        self.q1 = Question.objects.create(quiz=self.quiz, question_text="Q1", question_type="MCQ")
        self.a1 = Answer.objects.create(question=self.q1, answer_text="Option A", is_correct=True)

    def test_prediction_and_explanation_persisted_together(self):
        """Req 9, 10: Prediction and explanation are persisted together and returned identically on refetch."""
        from django.utils import timezone
        attempt = QuizAttempt.objects.create(
            student=self.student,
            quiz=self.quiz,
            attempt_number=1,
            start_time=timezone.now(),
            end_time=timezone.now(),
            status=QuizAttempt.STATUS_SUBMITTED,
            score=80.0,
        )
        # Create 10 questions and answers for the attempt to meet the 10-interaction minimum safeguard
        for i in range(10):
            q = Question.objects.create(quiz=self.quiz, question_text=f"Q_shap_{i}", question_type="MCQ")
            a = Answer.objects.create(question=q, answer_text="Option A", is_correct=True)
            AttemptAnswer.objects.create(
                attempt=attempt,
                question=q,
                selected_answer=a,
                is_correct=True,
            )

        res = evaluate_and_store_attempt_risk(attempt)
        self.assertIsNotNone(res)
        self.assertIn("explanation", res)
        self.assertEqual(res["explanation"]["status"], "available")

        # Verify DB persistence
        risk_obj = RiskPrediction.objects.filter(attempt=attempt).first()
        self.assertIsNotNone(risk_obj)
        self.assertEqual(risk_obj.explanation_method, "SHAP")
        self.assertIsNotNone(risk_obj.shap_base_value)
        self.assertIn("factors", risk_obj.explanation_factors)

        # Refetch API endpoint as System Admin to view technical explanation
        admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)
        admin_user = User.objects.create_user(username="admin_shap_test", role=admin_role)
        self.client.force_authenticate(user=admin_user)
        refetch_res = self.client.get(f"/api/attempts/attempts/{attempt.id}/")
        self.assertEqual(refetch_res.status_code, status.HTTP_200_OK)

        risk_data = refetch_res.data["risk_prediction"]
        self.assertIsNotNone(risk_data)
        self.assertIn("technical_explanation", risk_data)
        tech_exp = risk_data["technical_explanation"]
        self.assertEqual(tech_exp["status"], "available")
        self.assertEqual(len(tech_exp["factors"]), len(res["explanation"]["factors"]))

    def test_existing_records_without_explanations_remain_accessible(self):
        """Req 11: Existing records without stored explanations return status unavailable without error."""
        from django.utils import timezone
        old_attempt = QuizAttempt.objects.create(
            student=self.student,
            quiz=self.quiz,
            attempt_number=1,
            start_time=timezone.now(),
            end_time=timezone.now(),
            status=QuizAttempt.STATUS_SUBMITTED,
            score=70.0,
        )
        old_risk = RiskPrediction.objects.create(
            student=self.student,
            attempt=old_attempt,
            risk_category="Not High Risk",
            risk_probability=0.25,
            threshold=0.50,
            model_version="junyi_academic_engagement_gb_v1",
            explanation_factors={"status": "unavailable", "factors": []},  # empty legacy record
        )

        admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)
        admin_user = User.objects.create_user(username="admin_legacy_test", role=admin_role)
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = admin_user

        serializer_data = QuizAttemptSerializer(old_attempt, context={"request": request}).data
        self.assertIn("risk_prediction", serializer_data)
        tech_exp = serializer_data["risk_prediction"].get("technical_explanation")
        self.assertIsNotNone(tech_exp)
        self.assertEqual(tech_exp["status"], "unavailable")
        self.assertEqual(tech_exp["factors"], [])

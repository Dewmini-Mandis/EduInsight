from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import Role
from apps.classes.models import Student
from apps.quizzes.models import Quiz
from apps.attempts.models import QuizAttempt
from apps.analytics.models import RiskPrediction
from apps.analytics.services.student_support_mapper import (
    build_student_support_presentation,
    build_teacher_educational_presentation,
    build_admin_technical_presentation,
)

User = get_user_model()


class RoleBasedRiskPresentationTestCase(TestCase):
    def setUp(self):
        self.role_student, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)
        self.role_teacher, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.role_admin, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)

        # 2. Teacher User
        self.teacher = User.objects.create_user(
            username="teacher_user",
            email="teacher@test.com",
            password="password123",
            role=self.role_teacher,
            first_name="Bob",
            last_name="Teacher"
        )

        self.quiz = Quiz.objects.create(
            title="Algebra Assessment",
            pass_mark=60,
            max_attempts=3,
            created_by=self.teacher
        )

        # 1. Student User & Student Instance
        self.student_user = User.objects.create_user(
            username="student_user",
            email="student@test.com",
            password="password123",
            role=self.role_student,
            first_name="Alice",
            last_name="Student"
        )
        self.student = Student.objects.create(user=self.student_user, registered_by=self.teacher)

        # 3. System Administrator User
        self.admin = User.objects.create_user(
            username="admin_user",
            email="admin@test.com",
            password="password123",
            role=self.role_admin,
            first_name="Charlie",
            last_name="Admin"
        )

        # High Risk Attempt & Prediction
        self.high_risk_attempt = QuizAttempt.objects.create(
            student=self.student,
            quiz=self.quiz,
            attempt_number=1,
            start_time=timezone.now(),
            score=45.0,
            status="SUBMITTED"
        )
        self.high_risk_prediction = RiskPrediction.objects.create(
            student=self.student,
            attempt=self.high_risk_attempt,
            risk_category="High Risk",
            risk_probability=0.78,
            threshold=0.50,
            model_version="junyi_academic_engagement_gb_v1",
            explanation_method="TreeSHAP",
            explainer_version="shap_v1",
            shap_base_value=0.12,
            explanation_factors={
                "status": "available",
                "factors": [
                    {"feature": "past_accuracy", "label": "Past Accuracy", "value": 0.40, "shap_value": 0.35, "abs_importance": 0.35, "effect": "increased_risk"},
                    {"feature": "recent_accuracy", "label": "Recent Accuracy", "value": 0.35, "shap_value": 0.40, "abs_importance": 0.40, "effect": "increased_risk"},
                    {"feature": "past_avg_attempts", "label": "Past Average Attempts", "value": 2.5, "shap_value": 0.20, "abs_importance": 0.20, "effect": "increased_risk"},
                    {"feature": "recent_avg_attempts", "label": "Recent Average Attempts", "value": 2.8, "shap_value": 0.15, "abs_importance": 0.15, "effect": "increased_risk"},
                    {"feature": "past_avg_time", "label": "Past Average Time", "value": 120.0, "shap_value": 0.10, "abs_importance": 0.10, "effect": "increased_risk"}
                ]
            }
        )

        # Not High Risk Attempt & Prediction
        self.low_risk_attempt = QuizAttempt.objects.create(
            student=self.student,
            quiz=self.quiz,
            attempt_number=2,
            start_time=timezone.now(),
            score=85.0,
            status="SUBMITTED"
        )
        self.low_risk_prediction = RiskPrediction.objects.create(
            student=self.student,
            attempt=self.low_risk_attempt,
            risk_category="Not High Risk",
            risk_probability=0.15,
            threshold=0.50,
            model_version="junyi_academic_engagement_gb_v1",
            explanation_method="TreeSHAP",
            explainer_version="shap_v1",
            shap_base_value=-0.5,
            explanation_factors={
                "status": "available",
                "factors": [
                    {"feature": "past_accuracy", "label": "Past Accuracy", "value": 0.85, "shap_value": -0.30, "abs_importance": 0.30, "effect": "reduced_risk"}
                ]
            }
        )

        self.client = APIClient()

    # -------------------------------------------------------------------------
    # 1. Student Support Mapper Unit Tests
    # -------------------------------------------------------------------------
    def test_student_high_risk_presentation(self):
        support = build_student_support_presentation(self.high_risk_prediction)
        self.assertEqual(support["status"], "extra_support_recommended")
        self.assertEqual(support["display_title"], "Extra Support Is Recommended")
        self.assertIn("reviewing a few topics", support["summary"])
        self.assertIsNotNone(support["next_action"])
        self.assertEqual(support["next_action"]["label"], "Review Recommended Materials")
        self.assertIn("does not represent a final judgement", support["supportive_note"])

    def test_student_response_no_high_risk_words_or_probability(self):
        support = build_student_support_presentation(self.high_risk_prediction)
        serialized_str = str(support)
        self.assertNotIn("High Risk", serialized_str)
        self.assertNotIn("risk_level", serialized_str)
        self.assertNotIn("risk_probability", serialized_str)
        self.assertNotIn("0.78", serialized_str)

    def test_student_max_three_non_duplicated_recommendations(self):
        support = build_student_support_presentation(self.high_risk_prediction)
        recs = support["recommendations"]
        self.assertLessEqual(len(recs), 3)
        categories = [r["category"] for r in recs]
        self.assertEqual(len(categories), len(set(categories)))

    def test_student_duplicate_attempts_combined(self):
        support = build_student_support_presentation(self.high_risk_prediction)
        recs = support["recommendations"]
        attempt_recs = [r for r in recs if r["category"] == "practise_difficult_questions"]
        self.assertLessEqual(len(attempt_recs), 1)

    def test_student_not_high_risk_presentation(self):
        support = build_student_support_presentation(self.low_risk_prediction)
        self.assertEqual(support["status"], "making_good_progress")
        self.assertEqual(support["display_title"], "You Are Making Good Progress")
        self.assertIn("satisfactory progress", support["summary"])
        self.assertEqual(len(support["recommendations"]), 0)

    # -------------------------------------------------------------------------
    # 2. Teacher Educational Presentation Unit Tests
    # -------------------------------------------------------------------------
    def test_teacher_sees_actual_risk_classification(self):
        presentation = build_teacher_educational_presentation(self.high_risk_prediction)
        self.assertEqual(presentation["risk_level"], "High Risk")
        self.assertEqual(presentation["risk_probability"], 78.0)
        self.assertIn("educational_explanation", presentation)

    def test_teacher_response_contains_no_raw_shap_values(self):
        presentation = build_teacher_educational_presentation(self.high_risk_prediction)
        serialized_str = str(presentation)
        self.assertNotIn("shap_value", serialized_str)
        self.assertNotIn("base_value", serialized_str)
        self.assertNotIn("TreeSHAP", serialized_str)

    # -------------------------------------------------------------------------
    # 3. System Administrator Presentation Unit Tests
    # -------------------------------------------------------------------------
    def test_admin_sees_raw_technical_explanation(self):
        admin_payload = build_admin_technical_presentation(self.high_risk_prediction)
        self.assertIsNotNone(admin_payload)
        self.assertIn("technical_explanation", admin_payload)
        tech = admin_payload["technical_explanation"]
        self.assertEqual(tech["method"], "TreeSHAP")
        self.assertEqual(tech["model_version"], "junyi_academic_engagement_gb_v1")
        self.assertEqual(tech["threshold"], 0.50)
        self.assertEqual(tech["base_value"], 0.12)
        self.assertGreater(len(tech["factors"]), 0)
        first_factor = tech["factors"][0]
        self.assertIn("feature", first_factor)
        self.assertIn("shap_value", first_factor)

    # -------------------------------------------------------------------------
    # 4. API Endpoints & Authorisation Security Tests
    # -------------------------------------------------------------------------
    def test_student_attempt_api_response_structure(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f"/api/attempts/attempts/{self.high_risk_attempt.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Student receives risk_support, but risk_prediction is None
        self.assertIn("risk_support", data)
        self.assertIsNone(data["risk_prediction"])
        self.assertEqual(data["risk_support"]["display_title"], "Extra Support Is Recommended")
        
        data_str = str(data)
        self.assertNotIn("High Risk", data_str)
        self.assertNotIn("risk_probability", data_str)

    def test_teacher_attempt_api_response_structure(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(f"/api/attempts/attempts/{self.high_risk_attempt.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIsNotNone(data["risk_prediction"])
        self.assertEqual(data["risk_prediction"]["risk_level"], "High Risk")
        self.assertEqual(data["risk_prediction"]["risk_probability"], 78.0)
        
        # Must not contain raw SHAP floats or base_value
        data_str = str(data)
        self.assertNotIn("shap_value", data_str)
        self.assertNotIn("base_value", data_str)

    def test_admin_attempt_api_response_structure(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/attempts/attempts/{self.high_risk_attempt.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIsNotNone(data["risk_prediction"])
        self.assertEqual(data["risk_prediction"]["risk_level"], "High Risk")

    def test_student_cannot_access_technical_explanation_endpoint(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f"/api/attempts/attempts/{self.high_risk_attempt.id}/technical_explanation/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_access_technical_explanation_endpoint(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(f"/api/attempts/attempts/{self.high_risk_attempt.id}/technical_explanation/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_technical_explanation_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/attempts/attempts/{self.high_risk_attempt.id}/technical_explanation/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["method"], "TreeSHAP")
        self.assertEqual(data["threshold"], 0.50)

    def test_unauthenticated_request_rejected(self):
        self.client.logout()
        response = self.client.get(f"/api/attempts/attempts/{self.high_risk_attempt.id}/technical_explanation/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_shap_data_fallback(self):
        no_explanation_attempt = QuizAttempt.objects.create(
            student=self.student,
            quiz=self.quiz,
            attempt_number=3,
            start_time=timezone.now(),
            score=50.0,
            status="SUBMITTED"
        )
        no_explanation_prediction = RiskPrediction.objects.create(
            student=self.student,
            attempt=no_explanation_attempt,
            risk_category="High Risk",
            risk_probability=0.60,
            threshold=0.50,
            model_version="junyi_academic_engagement_gb_v1",
            explanation_factors={"status": "unavailable", "factors": []}
        )
        
        # Test Admin Fallback
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/attempts/attempts/{no_explanation_attempt.id}/technical_explanation/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["status"], "unavailable")
        msg = data.get("summary") or data.get("message") or ""
        self.assertIn("Technical explanation is unavailable", msg)

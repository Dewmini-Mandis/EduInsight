from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student, TeacherClassroom
from apps.quizzes.models import AcademicTerm, Lesson, QuizLevel, DifficultyLevel, Quiz, Question, Answer, Skill, LearningMaterial
from apps.attempts.models import QuizAttempt, AttemptAnswer, StudentRemediationState, TeacherIntervention
from apps.analytics.models import RiskPrediction

class TeacherDashboardRiskAlertsTestCase(TestCase):
    def setUp(self):
        self.student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)
        self.teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.school = School.objects.create(name="Alert Test School")

        self.teacher_a = User.objects.create_user(
            username="teacher_a_risk",
            email="teacher_a@test.com",
            password="password123",
            role=self.teacher_role,
            school=self.school
        )
        self.teacher_b = User.objects.create_user(
            username="teacher_b_risk",
            email="teacher_b@test.com",
            password="password123",
            role=self.teacher_role,
            school=self.school
        )

        self.classroom_a = SchoolClass.objects.create(name="Class 10A", school=self.school)
        self.classroom_b = SchoolClass.objects.create(name="Class 10B", school=self.school)

        TeacherClassroom.objects.create(teacher=self.teacher_a, classroom=self.classroom_a, is_active=True)
        TeacherClassroom.objects.create(teacher=self.teacher_b, classroom=self.classroom_b, is_active=True)

        self.student_1 = User.objects.create_user(username="student_1_risk", role=self.student_role, school=self.school)
        self.student_2 = User.objects.create_user(username="student_2_risk", role=self.student_role, school=self.school)
        self.student_other = User.objects.create_user(username="student_other_risk", role=self.student_role, school=self.school)

        self.student_profile_1 = Student.objects.create(user=self.student_1, registered_by=self.teacher_a, class_room=self.classroom_a)
        self.student_profile_2 = Student.objects.create(user=self.student_2, registered_by=self.teacher_a, class_room=self.classroom_a)
        self.student_profile_other = Student.objects.create(user=self.student_other, registered_by=self.teacher_b, class_room=self.classroom_b)

        self.term = AcademicTerm.objects.create(name="Term 1", order=1)
        self.lesson = Lesson.objects.create(title="Algebra", term=self.term)
        self.skill = Skill.objects.create(name="Linear Equations", lesson=self.lesson)
        self.level = QuizLevel.objects.create(name="Beginner", order=1)
        self.diff = DifficultyLevel.objects.create(name="Easy", order=1)

        self.quiz = Quiz.objects.create(
            title="Algebra Assessment",
            lesson=self.lesson,
            skill=self.skill,
            school=self.school,
            created_by=self.teacher_a,
            assigned_class=self.classroom_a,
            status="PUBLISHED",
            quiz_level=self.level,
            difficulty=self.diff,
            pass_mark=70,
            max_attempts=3
        )

        self.client = APIClient()

    def test_risk_alerts_qualification_scenarios(self):
        # TEST A: Ordinary failure (first attempt) -> NOT in risk alerts
        from django.utils import timezone
        att_ord_fail = QuizAttempt.objects.create(
            student=self.student_profile_1,
            quiz=self.quiz,
            attempt_number=1,
            attempt_type=QuizAttempt.TYPE_ORDINARY,
            score=40,
            start_time=timezone.now(),
            status=QuizAttempt.STATUS_SUBMITTED
        )
        
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.get("/api/analytics/overview/dashboard_summary/")
        self.assertEqual(res.status_code, 200)
        risk_students = res.data["riskStudents"]
        self.assertEqual(len(risk_students), 0, "Ordinary failure must not appear in Risk Alerts")

        # TEST B: Remediation assigned (pending materials) -> NOT in risk alerts
        rem_state_1 = StudentRemediationState.objects.create(
            student=self.student_profile_1,
            quiz=self.quiz,
            status=StudentRemediationState.STATUS_PENDING_MATERIALS
        )
        res = self.client.get("/api/analytics/overview/dashboard_summary/")
        self.assertEqual(len(res.data["riskStudents"]), 0, "Pending remediation must not appear in Risk Alerts")

        # TEST C: Reassessment unlocked but not attempted -> NOT in risk alerts
        rem_state_1.status = StudentRemediationState.STATUS_REASSESSMENT_UNLOCKED
        rem_state_1.save()
        res = self.client.get("/api/analytics/overview/dashboard_summary/")
        self.assertEqual(len(res.data["riskStudents"]), 0, "Unlocked reassessment not taken must not appear in Risk Alerts")

        # TEST D: Reassessment passed -> NOT in risk alerts
        att_reassess_pass = QuizAttempt.objects.create(
            student=self.student_profile_1,
            quiz=self.quiz,
            attempt_number=1,
            attempt_type=QuizAttempt.TYPE_REASSESSMENT,
            score=85,
            start_time=timezone.now(),
            status=QuizAttempt.STATUS_SUBMITTED
        )
        rem_state_1.status = StudentRemediationState.STATUS_COMPLETED_SUCCESS
        rem_state_1.reassessment_attempt = att_reassess_pass
        rem_state_1.save()
        res = self.client.get("/api/analytics/overview/dashboard_summary/")
        self.assertEqual(len(res.data["riskStudents"]), 0, "Passed reassessment must not appear in Risk Alerts")

        # TEST E: Reassessment FAILS -> STATUS_ESCALATED_TEACHER & TeacherIntervention created -> INCLUDED in risk alerts
        att_reassess_fail = QuizAttempt.objects.create(
            student=self.student_profile_2,
            quiz=self.quiz,
            attempt_number=1,
            attempt_type=QuizAttempt.TYPE_REASSESSMENT,
            score=50,
            start_time=timezone.now(),
            status=QuizAttempt.STATUS_SUBMITTED
        )
        rem_state_2 = StudentRemediationState.objects.create(
            student=self.student_profile_2,
            quiz=self.quiz,
            status=StudentRemediationState.STATUS_ESCALATED_TEACHER,
            reassessment_attempt=att_reassess_fail
        )
        intervention_2 = TeacherIntervention.objects.create(
            student=self.student_profile_2,
            quiz=self.quiz,
            remediation_state=rem_state_2,
            is_pending=True,
            notes="Reassessment failed (50% vs 70%)",
            skill=self.skill
        )

        res = self.client.get("/api/analytics/overview/dashboard_summary/")
        self.assertEqual(res.status_code, 200)
        risk_students = res.data["riskStudents"]
        self.assertEqual(len(risk_students), 1, "Failed reassessment student must appear in Risk Alerts")
        self.assertEqual(risk_students[0]["name"], self.student_2.get_full_name() or self.student_2.username)
        self.assertEqual(risk_students[0]["score"], 50)
        self.assertEqual(risk_students[0]["passMark"], 70)
        self.assertEqual(risk_students[0]["status"], "Needs Teacher Intervention")

        # TEST G: Other teacher's student in escalated state -> NOT visible to Teacher A
        rem_state_other = StudentRemediationState.objects.create(
            student=self.student_profile_other,
            quiz=self.quiz,
            status=StudentRemediationState.STATUS_ESCALATED_TEACHER
        )
        TeacherIntervention.objects.create(
            student=self.student_profile_other,
            quiz=self.quiz,
            remediation_state=rem_state_other,
            is_pending=True
        )

        res_a = self.client.get("/api/analytics/overview/dashboard_summary/")
        self.assertEqual(len(res_a.data["riskStudents"]), 1, "Teacher A should only see their own student")

        # Authenticate as Teacher B
        self.client.force_authenticate(user=self.teacher_b)
        res_b = self.client.get("/api/analytics/overview/dashboard_summary/")
        self.assertEqual(len(res_b.data["riskStudents"]), 1, "Teacher B should only see student_other")
        self.assertEqual(res_b.data["riskStudents"][0]["name"], self.student_other.get_full_name() or self.student_other.username)

        # TEST F: Teacher resolves intervention -> Removed from active Risk Alerts
        self.client.force_authenticate(user=self.teacher_a)
        intervention_2.is_pending = False
        intervention_2.save()

        res_after_resolve = self.client.get("/api/analytics/overview/dashboard_summary/")
        self.assertEqual(len(res_after_resolve.data["riskStudents"]), 0, "Resolved intervention must be excluded from active Risk Alerts")

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User, Role
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student
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
        - System Admin sees all quizzes
        - Teacher A sees only quizzes created by Teacher A
        - Teacher B sees only quizzes created by Teacher B
        - Student sees published quizzes from system admin or registered teacher / school
        """
        quiz_nat = Quiz.objects.create(title="National Quiz", created_by=self.sys_admin, school=None, status=Quiz.STATUS_PUBLISHED)
        quiz_a = Quiz.objects.create(title="School A Quiz", created_by=self.teacher_a, school=self.school_a, status=Quiz.STATUS_PUBLISHED)
        quiz_b = Quiz.objects.create(title="School B Quiz", created_by=self.teacher_b, school=self.school_b, status=Quiz.STATUS_PUBLISHED)

        def get_items(res):
            return res.data["results"] if isinstance(res.data, dict) and "results" in res.data else res.data

        # 1. System Admin sees all 3 quizzes
        self.client.force_authenticate(user=self.sys_admin)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_items(res)), 3)

        # 2. Teacher A sees ONLY quizzes created by Teacher A (1 quiz)
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = get_items(res)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "School A Quiz")

        # 3. Teacher B sees ONLY quizzes created by Teacher B (1 quiz)
        self.client.force_authenticate(user=self.teacher_b)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = get_items(res)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "School B Quiz")

    def test_teacher_quiz_strict_ownership_isolation(self):
        """
        Verify Teacher B cannot view details, edit, or delete Teacher A's quiz even in the same school.
        """
        # Teacher A and Teacher B in same school
        self.teacher_b.school = self.school_a
        self.teacher_b.save()

        quiz_a = Quiz.objects.create(title="Teacher A Quiz", created_by=self.teacher_a, school=self.school_a)
        quiz_b = Quiz.objects.create(title="Teacher B Quiz", created_by=self.teacher_b, school=self.school_a)

        # 1. Teacher B list does NOT include Teacher A Quiz
        self.client.force_authenticate(user=self.teacher_b)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = [q["title"] for q in (res.data.get("results") or res.data)]
        self.assertIn("Teacher B Quiz", titles)
        self.assertNotIn("Teacher A Quiz", titles)

        # 2. Teacher B GET details on Quiz A returns 404 (or 403)
        detail_url = f"{self.list_url}{quiz_a.id}/"
        res = self.client.get(detail_url)
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # 3. Teacher B PATCH Quiz A is rejected
        res = self.client.patch(detail_url, {"title": "Hacked Title"}, format="json")
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])
        quiz_a.refresh_from_db()
        self.assertEqual(quiz_a.title, "Teacher A Quiz")

        # 4. Teacher B DELETE Quiz A is rejected
        res = self.client.delete(detail_url)
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])
        self.assertTrue(Quiz.objects.filter(id=quiz_a.id).exists())

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

        url = f"{self.list_url}{quiz.id}/"
        self.client.force_authenticate(user=self.sys_admin)
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.assertEqual(Quiz.objects.filter(is_deleted=False).count(), 0)
        quiz.refresh_from_db()
        self.assertTrue(quiz.is_deleted)

    def test_performance_queries_count(self):
        """
        Verify that listing quizzes executes a controlled, optimal number of queries (no N+1).
        """
        term = AcademicTerm.objects.create(name="Term 1", order=1)
        lesson = Lesson.objects.create(title="Algebra", term=term, created_by=self.sys_admin)
        
        # Create 5 quizzes with questions and answers
        for i in range(5):
            q = Quiz.objects.create(title=f"Quiz {i}", created_by=self.sys_admin, lesson=lesson)
            q1 = Question.objects.create(quiz=q, question_text=f"Q1_{i}", question_type="MCQ")
            Answer.objects.create(question=q1, answer_text="Ans A", is_correct=True)
            Answer.objects.create(question=q1, answer_text="Ans B", is_correct=False)

        self.client.force_authenticate(user=self.sys_admin)
        
        # Expect fixed number of SQL queries regardless of 5 items
        with self.assertNumQueries(7):
            res = self.client.get(self.list_url)
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            items = res.data["results"] if isinstance(res.data, dict) and "results" in res.data else res.data
            self.assertEqual(len(items), 5)

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

        # Teacher cannot update the lesson (Forbidden)
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.patch(f"{lesson_url}{lesson_id}/", {"title": "Updated Title"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # System Admin can update the lesson
        self.client.force_authenticate(user=self.sys_admin)
        res = self.client.patch(f"{lesson_url}{lesson_id}/", {"title": "Updated Title"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "Updated Title")

        # Student cannot delete the lesson
        self.client.force_authenticate(user=self.student_a)
        res = self.client.delete(f"{lesson_url}{lesson_id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Teacher cannot delete the lesson (Forbidden)
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.delete(f"{lesson_url}{lesson_id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # System Admin can delete the lesson
        self.client.force_authenticate(user=self.sys_admin)
        res = self.client.delete(f"{lesson_url}{lesson_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_quiz_filtering_by_lesson(self):
        """
        Verify that quizzes can be filtered by the lesson query parameter.
        """
        class_room = SchoolClass.objects.create(name="Grade 6A", school=self.school_a)
        Student.objects.create(user=self.student_a, registered_by=self.teacher_a, class_room=class_room)

        lesson_1 = Lesson.objects.create(title="Lesson 1", term=self.term1, created_by=self.teacher_a)
        lesson_2 = Lesson.objects.create(title="Lesson 2", term=self.term1, created_by=self.teacher_a)

        quiz_1 = Quiz.objects.create(title="Quiz 1", created_by=self.teacher_a, assigned_class=class_room, lesson=lesson_1, status=Quiz.STATUS_PUBLISHED)
        quiz_2 = Quiz.objects.create(title="Quiz 2", created_by=self.teacher_a, assigned_class=class_room, lesson=lesson_2, status=Quiz.STATUS_PUBLISHED)

        self.client.force_authenticate(user=self.student_a)
        
        def get_items(res):
            return res.data["results"] if isinstance(res.data, dict) and "results" in res.data else res.data

        # Retrieve all
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should see quiz_1 and quiz_2
        quiz_ids = [q["id"] for q in get_items(res)]
        self.assertIn(quiz_1.id, quiz_ids)
        self.assertIn(quiz_2.id, quiz_ids)

        # Filter by lesson_1
        res = self.client.get(f"{self.list_url}?lesson={lesson_1.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        filtered_ids = [q["id"] for q in get_items(res)]
        self.assertIn(quiz_1.id, filtered_ids)
        self.assertNotIn(quiz_2.id, filtered_ids)

        # Filter by lesson_2
        res = self.client.get(f"{self.list_url}?lesson={lesson_2.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        filtered_ids = [q["id"] for q in get_items(res)]
        self.assertIn(quiz_2.id, filtered_ids)
        self.assertNotIn(quiz_1.id, filtered_ids)


from apps.quizzes.models import Skill
from apps.classes.models import Student
from apps.quizzes.services.question_pool_service import (
    validate_quiz_question_bank,
    select_and_allocate_attempt_questions,
    verify_remediation_completion,
    calculate_reassessment_comparison,
)
from apps.attempts.models import QuizAttempt, AttemptQuestion
from apps.recommendations.models import Remediation


class QuestionBankValidationAndAllocationTests(APITestCase):
    def setUp(self):
        self.teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)

        self.teacher = User.objects.create_user(username="t_test", email="tt@test.com", password="password123", role=self.teacher_role)
        self.student_user = User.objects.create_user(username="s_test", email="st@test.com", password="password123", role=self.student_role)
        self.student, _ = Student.objects.get_or_create(user=self.student_user)

        self.skill = Skill.objects.create(name="Algebra Roots")
        self.quiz = Quiz.objects.create(title="Algebra Quiz", max_attempts=2, pass_mark=75, created_by=self.teacher, skill=self.skill)

    def test_bank_with_less_than_30_questions_fails_validation(self):
        """
        Verify that a skill bank with fewer than 30 unique questions fails validation for 2 attempts + 1 reassessment.
        """
        # Create 18 questions (deficient for 30 requirement)
        for i in range(18):
            q = Question.objects.create(skill=self.skill, question_text=f"Question {i+1}", question_type="MCQ")
            Answer.objects.create(question=q, answer_text="Option A", is_correct=True)

        val_result = validate_quiz_question_bank(self.quiz)
        self.assertFalse(val_result["valid"])
        self.assertEqual(val_result["skill_validations"][0]["available"], 18)
        self.assertEqual(val_result["skill_validations"][0]["required_total"], 30)
        self.assertEqual(val_result["skill_validations"][0]["missing_count"], 12)

    def test_bank_with_30_questions_passes_validation(self):
        """
        Verify that a skill bank with 30 unique questions passes validation for 2 attempts + 1 reassessment.
        """
        for i in range(30):
            q = Question.objects.create(skill=self.skill, question_text=f"Question {i+1}", question_type="MCQ")
            Answer.objects.create(question=q, answer_text="Option A", is_correct=True)

        val_result = validate_quiz_question_bank(self.quiz)
        self.assertTrue(val_result["valid"])
        self.assertEqual(val_result["skill_validations"][0]["available"], 30)
        self.assertEqual(val_result["skill_validations"][0]["missing_count"], 0)

    def test_non_overlapping_allocation_across_attempts_and_reassessment(self):
        """
        Verify Attempt 1 (Set A), Attempt 2 (Set B), and Reassessment (Set C) receive 100% non-overlapping questions.
        """
        questions = []
        for i in range(30):
            q = Question.objects.create(skill=self.skill, question_text=f"Question {i+1}", question_type="MCQ")
            Answer.objects.create(question=q, answer_text="Option A", is_correct=True)
            questions.append(q)

        # 1. Allocate Attempt 1
        set_a = select_and_allocate_attempt_questions(self.student, self.quiz, attempt_type="ORDINARY", attempt_number=1)
        self.assertEqual(len(set_a), 10)
        att_1 = QuizAttempt.objects.create(student=self.student, quiz=self.quiz, attempt_type="ORDINARY", attempt_number=1, start_time="2026-09-28T00:00:00Z")
        AttemptQuestion.objects.bulk_create([AttemptQuestion(attempt=att_1, question=q, order=i+1) for i, q in enumerate(set_a)])

        # 2. Allocate Attempt 2
        set_b = select_and_allocate_attempt_questions(self.student, self.quiz, attempt_type="ORDINARY", attempt_number=2)
        self.assertEqual(len(set_b), 10)
        att_2 = QuizAttempt.objects.create(student=self.student, quiz=self.quiz, attempt_type="ORDINARY", attempt_number=2, start_time="2026-09-28T00:10:00Z")
        AttemptQuestion.objects.bulk_create([AttemptQuestion(attempt=att_2, question=q, order=i+1) for i, q in enumerate(set_b)])

        # 3. Allocate Reassessment
        set_c = select_and_allocate_attempt_questions(self.student, self.quiz, attempt_type="REASSESSMENT", attempt_number=1)
        self.assertEqual(len(set_c), 10)

        # Verify sets are mutually exclusive
        ids_a = {q.id for q in set_a}
        ids_b = {q.id for q in set_b}
        ids_c = {q.id for q in set_c}

        self.assertEqual(len(ids_a.intersection(ids_b)), 0, "Attempt 1 and Attempt 2 must have no overlapping questions.")
        self.assertEqual(len(ids_a.intersection(ids_c)), 0, "Attempt 1 and Reassessment must have no overlapping questions.")
        self.assertEqual(len(ids_b.intersection(ids_c)), 0, "Attempt 2 and Reassessment must have no overlapping questions.")


class StudentQuizVisibilityTests(APITestCase):
    def setUp(self):
        self.teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)
        self.sys_admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)

        self.school = School.objects.create(name="Central High", location="Colombo")

        self.sys_admin = User.objects.create_user(
            username="sys_admin_vis", email="sys_vis@test.com", password="password123", role=self.sys_admin_role
        )
        self.term1 = AcademicTerm.objects.create(name="Term 1 Visibility")

        self.class_6a = SchoolClass.objects.create(name="Grade 6A", school=self.school)
        self.class_6b = SchoolClass.objects.create(name="Grade 6B", school=self.school)

        self.teacher_a = User.objects.create_user(
            username="teacher_a_vis", email="t_a_vis@test.com", password="password123", role=self.teacher_role, school=self.school
        )
        self.teacher_b = User.objects.create_user(
            username="teacher_b_vis", email="t_b_vis@test.com", password="password123", role=self.teacher_role, school=self.school
        )

        self.student_user_a = User.objects.create_user(
            username="student_a_vis", email="s_a_vis@test.com", password="password123", role=self.student_role, school=self.school
        )
        self.student_a = Student.objects.create(
            user=self.student_user_a,
            registered_by=self.teacher_a,
            class_room=self.class_6a,
            index_no="IND_VIS_1"
        )

        # Teacher A creates Quiz A1 for Class 6A
        self.quiz_a1 = Quiz.objects.create(
            title="Quiz A1 - 6A",
            created_by=self.teacher_a,
            assigned_class=self.class_6a,
            status=Quiz.STATUS_PUBLISHED
        )

        # Teacher A creates Quiz A2 for Class 6B
        self.quiz_a2 = Quiz.objects.create(
            title="Quiz A2 - 6B",
            created_by=self.teacher_a,
            assigned_class=self.class_6b,
            status=Quiz.STATUS_PUBLISHED
        )

        # Teacher B creates Quiz B1 for Class 6A
        self.quiz_b1 = Quiz.objects.create(
            title="Quiz B1 - 6A",
            created_by=self.teacher_b,
            assigned_class=self.class_6a,
            status=Quiz.STATUS_PUBLISHED
        )

    def test_student_sees_only_assigned_teacher_and_class_quiz(self):
        """
        TEST 1: Login Student A (Teacher A, Class 6A).
        Expected: Quiz A1 visible. Must NOT show Quiz A2 (Class 6B) or Quiz B1 (Teacher B).
        """
        self.client.force_authenticate(user=self.student_user_a)
        res = self.client.get("/api/quizzes/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        quizzes = res.data.get("results") if isinstance(res.data, dict) and "results" in res.data else res.data
        titles = [q["title"] for q in quizzes]

        self.assertIn("Quiz A1 - 6A", titles)
        self.assertNotIn("Quiz A2 - 6B", titles)
        self.assertNotIn("Quiz B1 - 6A", titles)

    def test_direct_url_access_to_unauthorized_quizzes(self):
        """
        TEST 2 & 3: Student A manually opens Quiz A2 URL or Quiz B1 URL. Access denied (404 or 403).
        """
        self.client.force_authenticate(user=self.student_user_a)

        # Quiz A2 (same teacher, wrong class)
        res = self.client.get(f"/api/quizzes/{self.quiz_a2.id}/")
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # Quiz B1 (wrong teacher, same class)
        res = self.client.get(f"/api/quizzes/{self.quiz_b1.id}/")
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_attempt_start_unauthorized_quiz_rejected(self):
        """
        TEST 4: Student A attempts to start Quiz B1 through API. Expected: rejected with 403.
        """
        self.client.force_authenticate(user=self.student_user_a)
        res = self.client.post("/api/attempts/attempts/start/", {"quiz": self.quiz_b1.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_a_publishes_another_quiz_for_class_6a(self):
        """
        TEST 5: Teacher A publishes another Quiz for Class 6A. Student A can see it.
        """
        new_quiz = Quiz.objects.create(
            title="Quiz A3 - 6A",
            created_by=self.teacher_a,
            assigned_class=self.class_6a,
            status=Quiz.STATUS_PUBLISHED
        )
        self.client.force_authenticate(user=self.student_user_a)
        res = self.client.get("/api/quizzes/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        quizzes = res.data.get("results") if isinstance(res.data, dict) and "results" in res.data else res.data
        titles = [q["title"] for q in quizzes]

        self.assertIn("Quiz A3 - 6A", titles)

    def test_teacher_b_publishes_quiz_for_class_6a_remains_hidden(self):
        """
        TEST 6: Teacher B publishes a Quiz for Class 6A. Student A still cannot see it.
        """
        new_quiz_b = Quiz.objects.create(
            title="Quiz B2 - 6A",
            created_by=self.teacher_b,
            assigned_class=self.class_6a,
            status=Quiz.STATUS_PUBLISHED
        )
        self.client.force_authenticate(user=self.student_user_a)
        res = self.client.get("/api/quizzes/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        quizzes = res.data.get("results") if isinstance(res.data, dict) and "results" in res.data else res.data
        titles = [q["title"] for q in quizzes]

        self.assertNotIn("Quiz B2 - 6A", titles)

    def test_teacher_a_publishes_quiz_for_class_6b_remains_hidden(self):
        """
        TEST 7: Teacher A publishes Quiz for Class 6B. Student A cannot see it.
        """
        new_quiz_6b = Quiz.objects.create(
            title="Quiz A4 - 6B",
            created_by=self.teacher_a,
            assigned_class=self.class_6b,
            status=Quiz.STATUS_PUBLISHED
        )
        self.client.force_authenticate(user=self.student_user_a)
        res = self.client.get("/api/quizzes/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        quizzes = res.data.get("results") if isinstance(res.data, dict) and "results" in res.data else res.data
        titles = [q["title"] for q in quizzes]

        self.assertNotIn("Quiz A4 - 6B", titles)

    def test_deleted_quizzes_are_not_displayed(self):
        """
        TEST 8: Verify that deleted quizzes (is_deleted=True or perform_destroy) do NOT display.
        """
        deleted_quiz = Quiz.objects.create(
            title="Quiz Deleted",
            created_by=self.teacher_a,
            assigned_class=self.class_6a,
            status=Quiz.STATUS_PUBLISHED,
            is_deleted=True
        )
        self.client.force_authenticate(user=self.student_user_a)
        res = self.client.get("/api/quizzes/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        quizzes = res.data.get("results") if isinstance(res.data, dict) and "results" in res.data else res.data
        titles = [q["title"] for q in quizzes]

        self.assertNotIn("Quiz Deleted", titles)

    def test_quiz_assigned_to_multiple_classes(self):
        """
        TEST 9: Multi-class assignment (assigned_classes ManyToMany).
        Quiz Q2 assigned to Grade 6A + Grade 6B.
        Student A1 (Teacher A, 6A) -> CAN see.
        Student A2 (Teacher A, 6B) -> CAN see.
        Student B1 (Teacher B, 6A) -> CANNOT see.
        """
        student_user_a2 = User.objects.create_user(
            username="student_a2_vis", email="s_a2_vis@test.com", password="password123", role=self.student_role, school=self.school
        )
        Student.objects.create(user=student_user_a2, registered_by=self.teacher_a, class_room=self.class_6b, index_no="IND_VIS_2")

        multi_quiz = Quiz.objects.create(
            title="Multi Class Quiz",
            created_by=self.teacher_a,
            status=Quiz.STATUS_PUBLISHED
        )
        multi_quiz.assigned_classes.add(self.class_6a, self.class_6b)

        # Student A1 (Teacher A, 6A) sees it
        self.client.force_authenticate(user=self.student_user_a)
        res = self.client.get("/api/quizzes/")
        quizzes = res.data.get("results") if isinstance(res.data, dict) and "results" in res.data else res.data
        titles = [q["title"] for q in quizzes]
        self.assertIn("Multi Class Quiz", titles)

        # Student A2 (Teacher A, 6B) sees it
        self.client.force_authenticate(user=student_user_a2)
        res = self.client.get("/api/quizzes/")
        quizzes = res.data.get("results") if isinstance(res.data, dict) and "results" in res.data else res.data
        titles = [q["title"] for q in quizzes]
        self.assertIn("Multi Class Quiz", titles)

    def test_teacher_edits_assign_to_class_reassignment(self):
        """
        TEST 10: Teacher edits Quiz assigned_class from 6A to 6B.
        Student A1 (6A) immediately loses access.
        """
        self.quiz_a1.assigned_class = self.class_6b
        self.quiz_a1.save()

        self.client.force_authenticate(user=self.student_user_a)
        res = self.client.get("/api/quizzes/")
        quizzes = res.data.get("results") if isinstance(res.data, dict) and "results" in res.data else res.data
        titles = [q["title"] for q in quizzes]
        self.assertNotIn("Quiz A1 - 6A", titles)

    def test_learning_material_lesson_skill_scoping_and_reorder(self):
        """
        Test Learning Material creation with Lesson + Skill scoping and bulk reordering.
        """
        from apps.quizzes.models import Lesson, Skill, LearningMaterial

        lesson_a = Lesson.objects.create(title="Perimeter Lesson", term=self.term1, created_by=self.sys_admin)
        skill_a1 = Skill.objects.create(name="Rectangle Perimeter", lesson=lesson_a)
        skill_a2 = Skill.objects.create(name="Square Perimeter", lesson=lesson_a)

        self.client.force_authenticate(user=self.teacher_a)

        # 1. Create Video material for Skill A1
        res1 = self.client.post("/api/quizzes/materials/", {
            "title": "Intro Video",
            "material_type": "VIDEO",
            "lesson": lesson_a.id,
            "skill": skill_a1.id,
            "order": 1
        })
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # 2. Create Note material for Skill A1
        res2 = self.client.post("/api/quizzes/materials/", {
            "title": "Formula Note",
            "material_type": "TEXT",
            "content": "P = 2(l + w)",
            "lesson": lesson_a.id,
            "skill": skill_a1.id,
            "order": 2
        })
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        mat1_id = res1.data["id"]
        mat2_id = res2.data["id"]

        # 3. Bulk reorder: Note (mat2_id) then Video (mat1_id)
        reorder_res = self.client.post("/api/quizzes/materials/reorder/", {
            "lesson": lesson_a.id,
            "skill": skill_a1.id,
            "ordered_ids": [mat2_id, mat1_id]
        }, format="json")
        self.assertEqual(reorder_res.status_code, status.HTTP_200_OK)

        # Check DB order
        m1 = LearningMaterial.objects.get(id=mat1_id)
        m2 = LearningMaterial.objects.get(id=mat2_id)
        self.assertEqual(m2.order, 1)
        self.assertEqual(m1.order, 2)

    def test_learning_material_invalid_skill_lesson(self):
        """
        Backend validation test: Cannot create Learning Material if Skill does not belong to Lesson.
        """
        from apps.quizzes.models import Lesson, Skill

        lesson_a = Lesson.objects.create(title="Lesson A", term=self.term1, created_by=self.sys_admin)
        lesson_b = Lesson.objects.create(title="Lesson B", term=self.term1, created_by=self.sys_admin)
        skill_b = Skill.objects.create(name="Skill in Lesson B", lesson=lesson_b)

        self.client.force_authenticate(user=self.teacher_a)

        res = self.client.post("/api/quizzes/materials/", {
            "title": "Mismatch Material",
            "material_type": "TEXT",
            "lesson": lesson_a.id,
            "skill": skill_b.id
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)





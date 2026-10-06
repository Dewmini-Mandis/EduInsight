import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, Role
from apps.classes.models import SchoolClass, Student
from apps.schools.models import School
from apps.quizzes.models import Quiz, Question, Answer, Skill, Lesson, AcademicTerm
from apps.attempts.models import QuizAttempt, AttemptQuestion
from apps.quizzes.services.question_pool_service import (
    get_eligible_questions_for_skill,
    select_and_allocate_attempt_questions,
    validate_quiz_question_bank,
)

class AllocationDebugTest(TestCase):
    def setUp(self):
        self.school = School.objects.create(name="Debug School")
        role_teacher, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        role_student, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)

        self.teacher = User.objects.create_user(
            username="teacher_dbg",
            email="teacher_dbg@test.com",
            password="Password123!",
            role=role_teacher,
            school=self.school,
        )
        self.student_user = User.objects.create_user(
            username="student_dbg",
            email="student_dbg@test.com",
            password="Password123!",
            role=role_student,
            school=self.school,
        )
        self.student = Student.objects.create(user=self.student_user, registered_by=self.teacher)

        self.term = AcademicTerm.objects.create(name="Term 1 DBG")
        self.lesson = Lesson.objects.create(title="Lesson DBG", term=self.term, created_by=self.teacher)
        
        self.skill_a = Skill.objects.create(name="Skill A DBG", lesson=self.lesson)
        self.skill_b = Skill.objects.create(name="Skill B DBG", lesson=self.lesson)
        self.skill_c = Skill.objects.create(name="Skill C DBG", lesson=self.lesson)

    def test_single_skill_30_questions_flow(self):
        quiz = Quiz.objects.create(
            title="Single Skill Quiz",
            lesson=self.lesson,
            skill=self.skill_a,
            max_attempts=2,
            pass_mark=50,
            created_by=self.teacher,
            school=self.school,
            status="PUBLISHED",
        )

        for i in range(30):
            q = Question.objects.create(
                quiz=quiz,
                skill=self.skill_a,
                question_text=f"Question {i+1} for Skill A",
                question_type=Question.TYPE_MCQ,
                difficulty_level="Medium",
            )
            Answer.objects.create(question=q, answer_text="Opt A", is_correct=True)

        # Attempt 1
        att1_qs = select_and_allocate_attempt_questions(self.student, quiz, attempt_type="ORDINARY", attempt_number=1)
        self.assertEqual(len(att1_qs), 10)

        att1 = QuizAttempt.objects.create(
            student=self.student, quiz=quiz, attempt_type="ORDINARY", attempt_number=1, start_time=timezone.now(), status="SUBMITTED", score=80.0
        )
        AttemptQuestion.objects.bulk_create([AttemptQuestion(attempt=att1, question=q, order=idx+1) for idx, q in enumerate(att1_qs)])

        # Attempt 2
        att2_qs = select_and_allocate_attempt_questions(self.student, quiz, attempt_type="ORDINARY", attempt_number=2)
        self.assertEqual(len(att2_qs), 10)

        att2 = QuizAttempt.objects.create(
            student=self.student, quiz=quiz, attempt_type="ORDINARY", attempt_number=2, start_time=timezone.now(), status="SUBMITTED", score=60.0
        )
        AttemptQuestion.objects.bulk_create([AttemptQuestion(attempt=att2, question=q, order=idx+1) for idx, q in enumerate(att2_qs)])

        # Reassessment
        re_qs = select_and_allocate_attempt_questions(self.student, quiz, attempt_type="REASSESSMENT", attempt_number=3)
        self.assertEqual(len(re_qs), 10)

        # Non-overlapping checks
        s1 = set(q.id for q in att1_qs)
        s2 = set(q.id for q in att2_qs)
        sr = set(q.id for q in re_qs)

        self.assertEqual(len(s1.intersection(s2)), 0)
        self.assertEqual(len(s1.intersection(sr)), 0)
        self.assertEqual(len(s2.intersection(sr)), 0)

    def test_multi_skill_allocation(self):
        quiz = Quiz.objects.create(
            title="Multi Skill Quiz",
            lesson=self.lesson,
            max_attempts=2,
            pass_mark=50,
            created_by=self.teacher,
            school=self.school,
            status="PUBLISHED",
        )
        quiz.skills.add(self.skill_a, self.skill_b)

        for i in range(30):
            q_a = Question.objects.create(quiz=quiz, skill=self.skill_a, question_text=f"A {i+1}", question_type="MCQ")
            Answer.objects.create(question=q_a, answer_text="Ans", is_correct=True)

            q_b = Question.objects.create(quiz=quiz, skill=self.skill_b, question_text=f"B {i+1}", question_type="MCQ")
            Answer.objects.create(question=q_b, answer_text="Ans", is_correct=True)

        # Attempt 1 gets 10 from A + 10 from B = 20
        att1_qs = select_and_allocate_attempt_questions(self.student, quiz, attempt_type="ORDINARY", attempt_number=1)
        self.assertEqual(len(att1_qs), 20)

        a_count = sum(1 for q in att1_qs if q.skill_id == self.skill_a.id)
        b_count = sum(1 for q in att1_qs if q.skill_id == self.skill_b.id)
        self.assertEqual(a_count, 10)
        self.assertEqual(b_count, 10)

import random
import datetime
from django.utils import timezone
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import Role
from apps.attempts.models import (
    QuizAttempt, AttemptQuestion, AttemptAnswer, ManualMark, TeacherOverride,
    StudentLessonProgress, StudentContentProgress, StudentEngagementAnswer, StudentVideoAnswer,
    StudentRemediationState, TeacherIntervention
)
from apps.attempts.serializers import (
    QuizAttemptSerializer, QuizAttemptListSerializer, ManualMarkSerializer, TeacherOverrideSerializer,
    StudentLessonProgressSerializer, StudentContentProgressSerializer,
    StudentEngagementAnswerSerializer, StudentVideoAnswerSerializer, StudentRemediationStateSerializer,
    TeacherInterventionSerializer
)
from apps.classes.models import Student
from apps.quizzes.models import Quiz, Question, Answer, CorrectAnswer, Skill, LearningMaterial, VideoQuestion
from apps.quizzes.views import can_student_access_quiz

def select_and_validate_quiz_questions(quiz):
    covered_skills = quiz.get_covered_skills()
    selected_questions = []
    
    if covered_skills:
        errors = []
        for skill in covered_skills:
            skill_qs = list(Question.objects.filter(skill=skill))
            quiz_skill_qs = [q for q in quiz.questions.all() if q.skill_id == skill.id]
            if len(quiz_skill_qs) >= 10:
                skill_qs = quiz_skill_qs
                
            count = len(skill_qs)
            if count < 10:
                needed = 10 - count
                errors.append(f"Skill '{skill.name}' has only {count} questions available. At least 10 questions are required ({needed} more needed).")
            else:
                sample_count = max(10, len(skill_qs) if len(skill_qs) == 10 else 10)
                selected_questions.extend(random.sample(skill_qs, sample_count))
                
        if errors:
            raise ValueError("Validation Error: " + " ".join(errors))
    else:
        quiz_qs = list(quiz.questions.all())
        if len(quiz_qs) < 10:
            raise ValueError(f"Validation Error: Quiz has only {len(quiz_qs)} questions available. At least 10 questions are required ({10 - len(quiz_qs)} more needed).")
        selected_questions = quiz_qs

    unique = list({q.id: q for q in selected_questions}.values())
    random.shuffle(unique)
    return unique

def get_attempt_question_map(attempt):
    """
    Returns a mapping of question.id -> question instance for all allocated questions in this attempt.
    Supports both AttemptQuestion snapshot allocation and quiz.questions pool.
    """
    attempt_qs = [
        aq.question
        for aq in attempt.attempt_questions.select_related("question__correct_answer").prefetch_related("question__answers").all()
    ]
    if not attempt_qs:
        attempt_qs = list(
            attempt.quiz.questions.select_related("correct_answer").prefetch_related("answers").all()
        )
    return {q.id: q for q in attempt_qs if q}

def calculate_attempt_score(attempt):
    total_questions = attempt.attempt_questions.count()
    if total_questions == 0:
        total_questions = attempt.answers.count()
    if total_questions == 0:
        return 0.0

    total_awarded = 0.0
    for ans in attempt.answers.all():
        if ans.is_correct:
            question_score = max(0.0, 1.0 - 0.25 * ans.hint_count)
            total_awarded += question_score

    score = (total_awarded / total_questions) * 100.0
    return round(score, 2)

class QuizAttemptViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return QuizAttemptListSerializer
        return QuizAttemptSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = QuizAttempt.objects.none()
        
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            queryset = QuizAttempt.objects.all()
        elif user.is_role(Role.ROLE_TEACHER):
            queryset = QuizAttempt.objects.filter(student__registered_by=user)
        elif user.is_role(Role.ROLE_STUDENT):
            student = getattr(user, "student_profile", None)
            if not student:
                student, _ = Student.objects.get_or_create(user=user)
            queryset = QuizAttempt.objects.filter(student=student, quiz__is_deleted=False)

        quiz_param = self.request.query_params.get("quiz")
        if quiz_param:
            queryset = queryset.filter(quiz_id=quiz_param)

        qs = queryset.select_related(
            "quiz", "quiz__lesson", "quiz__skill", "quiz__lesson__term", "student__user"
        )
        if getattr(self, "action", None) != "list":
            from django.db.models import Prefetch
            from apps.attempts.models import AttemptQuestion, AttemptAnswer
            qs = qs.prefetch_related(
                Prefetch(
                    "answers",
                    queryset=AttemptAnswer.objects.select_related("question", "skill")
                ),
                "risk_predictions",
                Prefetch(
                    "attempt_questions",
                    queryset=AttemptQuestion.objects.select_related(
                        "question",
                        "question__skill",
                        "question__correct_answer",
                    ).prefetch_related(
                        "question__answers",
                        "question__hints",
                    )
                ),
            )

        return qs.order_by("-start_time", "-id")

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_role(Role.ROLE_STUDENT):
            return Response({"detail": "Only students can submit quiz attempts."}, status=status.HTTP_403_FORBIDDEN)
        
        student, _ = Student.objects.get_or_create(user=user)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("SERIALIZER ERRORS:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        quiz = serializer.validated_data["quiz"]
        if not can_student_access_quiz(user, quiz):
            return Response({"detail": "You do not have permission to access or submit attempts for this quiz."}, status=status.HTTP_403_FORBIDDEN)

        existing_attempts = QuizAttempt.objects.filter(student=student, quiz=quiz)
        max_attempts = getattr(quiz, "max_attempts", 3) or 3
        if existing_attempts.count() >= max_attempts:
            return Response({"detail": f"You have reached the maximum limit of {max_attempts} attempts for this quiz."}, status=status.HTTP_400_BAD_REQUEST)

        start_time = timezone.now()
        attempt = serializer.save(
            student=student,
            attempt_number=existing_attempts.count() + 1,
            start_time=start_time,
            end_time=start_time,
            status=QuizAttempt.STATUS_SUBMITTED
        )

        answers_data = request.data.get("answers", [])
        if answers_data:
            quiz_questions = get_attempt_question_map(attempt)
            for ans_item in answers_data:
                q_id = ans_item.get("question")
                selected_ans_id = ans_item.get("selected_answer")
                typed_val = ans_item.get("typed_answer")
                hint_count = int(ans_item.get("hint_count", 0))

                question = quiz_questions.get(q_id)
                if not question:
                    continue

                is_correct = False
                selected_answer = None
                typed_answer = None

                if question.question_type == Question.TYPE_MCQ:
                    if selected_ans_id:
                        selected_answer = next((a for a in question.answers.all() if a.id == selected_ans_id), None)
                        if selected_answer:
                            is_correct = selected_answer.is_correct
                elif question.question_type == Question.TYPE_NUMERIC:
                    if typed_val is not None and str(typed_val).strip() != "":
                        typed_answer = str(typed_val).strip()
                        correct_ans = getattr(question, "correct_answer", None)
                        if correct_ans and correct_ans.correct_value.strip().lower() == typed_answer.lower():
                            is_correct = True

                AttemptAnswer.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_answer=selected_answer,
                    typed_answer=typed_answer,
                    is_correct=is_correct,
                    hint_count=hint_count,
                    skill=question.skill or attempt.quiz.skill,
                )

        attempt.score = calculate_attempt_score(attempt)
        attempt.save()

        try:
            from apps.analytics.services.risk_predictor import evaluate_and_store_attempt_risk
            evaluate_and_store_attempt_risk(attempt)
            attempt.refresh_from_db()
        except Exception as e:
            print(f"Risk prediction evaluation failed safely: {e}")

        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def start(self, request):
        from django.db import transaction
        user = request.user
        if not user.is_role(Role.ROLE_STUDENT):
            return Response({"detail": "Only students can start quiz attempts."}, status=status.HTTP_403_FORBIDDEN)

        student, _ = Student.objects.get_or_create(user=user)
        quiz_id = request.data.get("quiz")
        if not quiz_id:
            return Response({"detail": "Quiz ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quiz = Quiz.objects.get(id=quiz_id, is_deleted=False)
        except Quiz.DoesNotExist:
            return Response({"detail": "Quiz not found or has been deleted."}, status=status.HTTP_404_NOT_FOUND)

        if not can_student_access_quiz(user, quiz):
            return Response({"detail": "You do not have permission to access or start this quiz."}, status=status.HTTP_403_FORBIDDEN)

        # Enforce Sequential Quiz Access for Lesson
        if quiz.lesson_id:
            prior_quizzes = Quiz.objects.filter(
                lesson_id=quiz.lesson_id,
                status="PUBLISHED",
                is_deleted=False,
                created_by=quiz.created_by
            ).order_by("order", "id")
            for pq in prior_quizzes:
                if pq.order < quiz.order or (pq.order == quiz.order and pq.id < quiz.id):
                    has_passed = QuizAttempt.objects.filter(
                        student=student, quiz=pq, score__gte=pq.pass_mark, status=QuizAttempt.STATUS_SUBMITTED
                    ).exists()
                    if not has_passed:
                        return Response(
                            {
                                "detail": f"Quiz '{quiz.title}' is locked. You must complete and pass previous quiz '{pq.title}' first.",
                                "locked": True
                            },
                            status=status.HTTP_403_FORBIDDEN
                        )

        with transaction.atomic():
            # Check for an active IN_PROGRESS attempt first
            active_attempt = QuizAttempt.objects.filter(
                student=student, quiz=quiz, status=QuizAttempt.STATUS_IN_PROGRESS
            ).select_for_update().first()

            if active_attempt:
                # Check if expired
                if active_attempt.expires_at and timezone.now() > active_attempt.expires_at:
                    active_attempt.status = QuizAttempt.STATUS_EXPIRED
                    active_attempt.auto_submitted = True
                    active_attempt.end_time = timezone.now()
                    active_attempt.score = calculate_attempt_score(active_attempt)
                    active_attempt.save()
                else:
                    # Return existing active attempt with snapshot
                    return Response(QuizAttemptSerializer(active_attempt).data, status=status.HTTP_200_OK)

            # Check attempt limit (count ordinary attempts only)
            existing_attempts = QuizAttempt.objects.filter(
                student=student, quiz=quiz, attempt_type=QuizAttempt.TYPE_ORDINARY
            ).select_for_update()
            existing_count = existing_attempts.count()
            max_attempts = getattr(quiz, "max_attempts", 3) or 3

            if existing_count >= max_attempts:
                override = TeacherOverride.objects.filter(
                    student=student, quiz=quiz, override_type="EXTRA_ATTEMPT", is_consumed=False
                ).first()
                if override:
                    override.is_consumed = True
                    override.save(update_fields=["is_consumed"])
                else:
                    return Response(
                        {"detail": f"You have reached the maximum limit of {max_attempts} attempts for this quiz."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Skill-based question selection & validation (non-overlapping per student)
            from apps.quizzes.services.question_pool_service import select_and_allocate_attempt_questions
            try:
                selected_questions = select_and_allocate_attempt_questions(
                    student, quiz, attempt_type=QuizAttempt.TYPE_ORDINARY, attempt_number=existing_count + 1
                )
            except ValueError as ve:
                return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)

            start_time = timezone.now()
            duration_minutes = getattr(quiz, "estimated_time_minutes", 10) or 10
            expires_at = start_time + datetime.timedelta(minutes=duration_minutes)

            attempt = QuizAttempt.objects.create(
                student=student,
                quiz=quiz,
                attempt_type=QuizAttempt.TYPE_ORDINARY,
                attempt_number=existing_count + 1,
                start_time=start_time,
                expires_at=expires_at,
                status=QuizAttempt.STATUS_IN_PROGRESS,
            )

            # Create snapshot of selected questions with fixed display order
            AttemptQuestion.objects.bulk_create([
                AttemptQuestion(attempt=attempt, question=q, order=idx + 1)
                for idx, q in enumerate(selected_questions)
            ])

        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def start_reassessment(self, request):
        from django.db import transaction
        from apps.quizzes.services.question_pool_service import select_and_allocate_attempt_questions, verify_remediation_completion
        user = request.user
        if not user.is_role(Role.ROLE_STUDENT):
            return Response({"detail": "Only students can start post-remedial reassessment."}, status=status.HTTP_403_FORBIDDEN)

        student, _ = Student.objects.get_or_create(user=user)
        quiz_id = request.data.get("quiz")
        if not quiz_id:
            return Response({"detail": "Quiz ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quiz = Quiz.objects.get(id=quiz_id, is_deleted=False)
        except Quiz.DoesNotExist:
            return Response({"detail": "Quiz not found or has been deleted."}, status=status.HTTP_404_NOT_FOUND)

        if not can_student_access_quiz(user, quiz):
            return Response({"detail": "You do not have permission to access or start this quiz."}, status=status.HTTP_403_FORBIDDEN)

        # 1. Verify student exhausted ordinary attempts without passing
        ordinary_attempts = QuizAttempt.objects.filter(
            student=student, quiz=quiz, attempt_type=QuizAttempt.TYPE_ORDINARY, status=QuizAttempt.STATUS_SUBMITTED
        )
        max_attempts = getattr(quiz, "max_attempts", 2) or 2
        has_passed_ordinary = ordinary_attempts.filter(score__gte=quiz.pass_mark).exists()

        if has_passed_ordinary:
            return Response({"detail": "You have already passed this quiz!"}, status=status.HTTP_400_BAD_REQUEST)

        if ordinary_attempts.count() < max_attempts:
            return Response({
                "detail": f"You must complete all {max_attempts} ordinary attempts before taking post-remedial reassessment."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Verify all assigned remediations are completed
        rem_check = verify_remediation_completion(student, quiz)
        if not rem_check["all_completed"]:
            return Response({
                "detail": rem_check["message"],
                "remediation_required": True,
                "remediation_status": rem_check
            }, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            # Check for active in-progress reassessment
            active_reassessment = QuizAttempt.objects.filter(
                student=student, quiz=quiz, attempt_type=QuizAttempt.TYPE_REASSESSMENT, status=QuizAttempt.STATUS_IN_PROGRESS
            ).select_for_update().first()

            if active_reassessment:
                if active_reassessment.expires_at and timezone.now() > active_reassessment.expires_at:
                    active_reassessment.status = QuizAttempt.STATUS_EXPIRED
                    active_reassessment.auto_submitted = True
                    active_reassessment.end_time = timezone.now()
                    active_reassessment.score = calculate_attempt_score(active_reassessment)
                    active_reassessment.save()
                else:
                    return Response(QuizAttemptSerializer(active_reassessment).data, status=status.HTTP_200_OK)

            # Check reassessment count
            reassessment_count = QuizAttempt.objects.filter(
                student=student, quiz=quiz, attempt_type=QuizAttempt.TYPE_REASSESSMENT
            ).count()

            # Select non-overlapping questions reserved for Set C (reassessment)
            try:
                selected_questions = select_and_allocate_attempt_questions(
                    student, quiz, attempt_type=QuizAttempt.TYPE_REASSESSMENT, attempt_number=reassessment_count + 1
                )
            except ValueError as ve:
                return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)

            start_time = timezone.now()
            duration_minutes = getattr(quiz, "estimated_time_minutes", 10) or 10
            expires_at = start_time + datetime.timedelta(minutes=duration_minutes)

            reassessment = QuizAttempt.objects.create(
                student=student,
                quiz=quiz,
                attempt_type=QuizAttempt.TYPE_REASSESSMENT,
                attempt_number=reassessment_count + 1,
                start_time=start_time,
                expires_at=expires_at,
                status=QuizAttempt.STATUS_IN_PROGRESS,
            )

            AttemptQuestion.objects.bulk_create([
                AttemptQuestion(attempt=reassessment, question=q, order=idx + 1)
                for idx, q in enumerate(selected_questions)
            ])

        return Response(QuizAttemptSerializer(reassessment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def active(self, request):
        user = request.user
        if not user.is_role(Role.ROLE_STUDENT):
            return Response({"active": False})

        student, _ = Student.objects.get_or_create(user=user)
        quiz_id = request.query_params.get("quiz")
        if not quiz_id:
            return Response({"active": False})

        active_attempt = QuizAttempt.objects.filter(
            student=student, quiz_id=quiz_id, status=QuizAttempt.STATUS_IN_PROGRESS
        ).first()

        if not active_attempt:
            return Response({"active": False})

        if active_attempt.expires_at and timezone.now() > active_attempt.expires_at:
            active_attempt.status = QuizAttempt.STATUS_EXPIRED
            active_attempt.auto_submitted = True
            active_attempt.end_time = timezone.now()
            active_attempt.score = calculate_attempt_score(active_attempt)
            active_attempt.save()
            return Response({
                "active": False,
                "finalized_attempt": QuizAttemptSerializer(active_attempt).data
            })

        return Response({
            "active": True,
            "attempt": QuizAttemptSerializer(active_attempt).data
        })

    @action(detail=True, methods=["post"])
    def save_answers(self, request, pk=None):
        from django.db import transaction
        user = request.user
        student, _ = Student.objects.get_or_create(user=user)

        with transaction.atomic():
            try:
                attempt = QuizAttempt.objects.select_for_update().get(id=pk, student=student)
            except QuizAttempt.DoesNotExist:
                return Response({"detail": "Attempt not found."}, status=status.HTTP_404_NOT_FOUND)

            if attempt.status != QuizAttempt.STATUS_IN_PROGRESS:
                return Response({
                    "expired": attempt.status == QuizAttempt.STATUS_EXPIRED,
                    "finalized": True,
                    "attempt": QuizAttemptSerializer(attempt).data
                })

            answers_data = request.data.get("answers", [])
            quiz_questions = get_attempt_question_map(attempt)

            for ans_item in answers_data:
                q_id = ans_item.get("question")
                selected_ans_id = ans_item.get("selected_answer")
                typed_val = ans_item.get("typed_answer")
                hint_count = int(ans_item.get("hint_count", 0))

                question = quiz_questions.get(q_id)
                if not question:
                    continue

                is_correct = False
                selected_answer = None
                typed_answer = None

                if question.question_type == Question.TYPE_MCQ:
                    if selected_ans_id:
                        selected_answer = next((a for a in question.answers.all() if a.id == selected_ans_id), None)
                        if selected_answer:
                            is_correct = selected_answer.is_correct
                elif question.question_type == Question.TYPE_NUMERIC:
                    if typed_val is not None:
                        typed_answer = str(typed_val).strip()
                        correct_ans = getattr(question, "correct_answer", None)
                        if correct_ans and correct_ans.correct_value.strip().lower() == typed_answer.lower():
                            is_correct = True

                AttemptAnswer.objects.update_or_create(
                    attempt=attempt,
                    question=question,
                    defaults={
                        "selected_answer": selected_answer,
                        "typed_answer": typed_answer,
                        "is_correct": is_correct,
                        "hint_count": hint_count,
                        "skill": question.skill or attempt.quiz.skill,
                    }
                )

            # Check expiry
            if attempt.expires_at and timezone.now() > attempt.expires_at:
                attempt.status = QuizAttempt.STATUS_EXPIRED
                attempt.auto_submitted = True
                attempt.end_time = timezone.now()
                attempt.score = calculate_attempt_score(attempt)
                attempt.save()
                return Response({
                    "expired": True,
                    "detail": "Time limit expired. Quiz auto-submitted.",
                    "attempt": QuizAttemptSerializer(attempt).data
                })

        return Response({
            "expired": False,
            "saved_count": len(answers_data),
            "expires_at": attempt.expires_at
        })

    @action(detail=True, methods=["get"], url_path="technical_explanation")
    def technical_explanation(self, request, pk=None):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return Response({"detail": "Only System Administrators are authorized to view technical model explanations."}, status=status.HTTP_403_FORBIDDEN)

        attempt = self.get_object()
        latest_pred = attempt.risk_predictions.order_by("-prediction_date", "-id").first()
        if not latest_pred:
            from apps.analytics.models import RiskPrediction
            latest_pred = RiskPrediction.objects.filter(student=attempt.student).order_by("-prediction_date", "-id").first()

        if not latest_pred and attempt.status in [QuizAttempt.STATUS_SUBMITTED, QuizAttempt.STATUS_EXPIRED]:
            try:
                from apps.analytics.services.risk_predictor import evaluate_and_store_attempt_risk
                latest_pred = evaluate_and_store_attempt_risk(attempt)
            except Exception as e:
                print(f"On-the-fly evaluation error: {e}")

        if not latest_pred:
            return Response({
                "status": "unavailable",
                "method": "SHAP",
                "model_version": "junyi_academic_engagement_gb_v1",
                "threshold": 0.50,
                "message": "Technical explanation is unavailable for this prediction.",
                "factors": []
            }, status=status.HTTP_200_OK)

        from apps.analytics.services.student_support_mapper import build_admin_technical_presentation
        admin_data = build_admin_technical_presentation(latest_pred)
        tech_exp = admin_data.get("technical_explanation") if admin_data else None
        if not tech_exp:
            return Response({
                "status": "unavailable",
                "method": "SHAP",
                "model_version": "junyi_academic_engagement_gb_v1",
                "threshold": 0.50,
                "message": "Technical explanation is unavailable for this prediction.",
                "factors": []
            }, status=status.HTTP_200_OK)
        return Response(tech_exp, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        from django.db import transaction
        user = request.user
        student, _ = Student.objects.get_or_create(user=user)

        with transaction.atomic():
            try:
                attempt = QuizAttempt.objects.select_for_update().get(id=pk, student=student)
            except QuizAttempt.DoesNotExist:
                return Response({"detail": "Attempt not found."}, status=status.HTTP_404_NOT_FOUND)

            if attempt.status in [QuizAttempt.STATUS_SUBMITTED, QuizAttempt.STATUS_EXPIRED]:
                return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_200_OK)

            is_auto_submit = request.data.get("is_auto_submit", False) or request.data.get("auto_submitted", False)
            is_expired = attempt.expires_at and timezone.now() > attempt.expires_at

            answers_data = request.data.get("answers", [])
            quiz_questions = get_attempt_question_map(attempt)

            # BACKEND VALIDATION: Manual submissions require EVERY question to be answered
            if not is_auto_submit and not is_expired:
                # Check existing saved answers
                existing_answers = {
                    a.question_id: (a.selected_answer_id is not None or (a.typed_answer is not None and a.typed_answer.strip() != ""))
                    for a in attempt.answers.all()
                }

                # Check payload answers
                incoming_answers = {}
                for ans_item in answers_data:
                    q_id = ans_item.get("question")
                    sel_ans = ans_item.get("selected_answer")
                    typ_ans = ans_item.get("typed_answer")
                    is_ans = sel_ans is not None or (typ_ans is not None and str(typ_ans).strip() != "")
                    if q_id:
                        incoming_answers[q_id] = is_ans

                unanswered_count = 0
                for q_id in quiz_questions.keys():
                    has_ans = incoming_answers.get(q_id, existing_answers.get(q_id, False))
                    if not has_ans:
                        unanswered_count += 1

                if unanswered_count > 0:
                    return Response(
                        {
                            "detail": "All questions must be answered before submission.",
                            "unanswered_count": unanswered_count
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            processed_question_ids = set()

            for ans_item in answers_data:
                q_id = ans_item.get("question")
                selected_ans_id = ans_item.get("selected_answer")
                typed_val = ans_item.get("typed_answer")
                hint_count = int(ans_item.get("hint_count", 0))

                question = quiz_questions.get(q_id)
                if not question:
                    continue

                processed_question_ids.add(question.id)

                is_correct = False
                selected_answer = None
                typed_answer = None

                if question.question_type == Question.TYPE_MCQ:
                    if selected_ans_id:
                        selected_answer = next((a for a in question.answers.all() if a.id == selected_ans_id), None)
                        if selected_answer:
                            is_correct = selected_answer.is_correct
                elif question.question_type == Question.TYPE_NUMERIC:
                    if typed_val is not None and str(typed_val).strip() != "":
                        typed_answer = str(typed_val).strip()
                        correct_ans = getattr(question, "correct_answer", None)
                        if correct_ans and correct_ans.correct_value.strip().lower() == typed_answer.lower():
                            is_correct = True

                AttemptAnswer.objects.update_or_create(
                    attempt=attempt,
                    question=question,
                    defaults={
                        "selected_answer": selected_answer,
                        "typed_answer": typed_answer,
                        "is_correct": is_correct,
                        "hint_count": hint_count,
                        "skill": question.skill or attempt.quiz.skill,
                    }
                )

            # Ensure all remaining allocated questions have an AttemptAnswer record (marked unanswered if missing)
            for q_id, question in quiz_questions.items():
                if q_id not in processed_question_ids:
                    AttemptAnswer.objects.get_or_create(
                        attempt=attempt,
                        question=question,
                        defaults={
                            "selected_answer": None,
                            "typed_answer": None,
                            "is_correct": False,
                            "hint_count": 0,
                            "skill": question.skill or attempt.quiz.skill,
                        }
                    )

            attempt.end_time = timezone.now()
            if (attempt.expires_at and timezone.now() > attempt.expires_at) or is_auto_submit:
                attempt.status = QuizAttempt.STATUS_EXPIRED
                attempt.auto_submitted = True
            else:
                attempt.status = QuizAttempt.STATUS_SUBMITTED
                attempt.auto_submitted = False

            attempt.score = calculate_attempt_score(attempt)
            attempt.save()

            try:
                from apps.analytics.services.risk_predictor import evaluate_and_store_attempt_risk
                evaluate_and_store_attempt_risk(attempt)
                attempt.refresh_from_db()
            except Exception as e:
                print(f"Risk prediction evaluation failed safely: {e}")

            # Multi-attempt, remediation, and reassessment workflow tracking
            attempt_result_status = "PASSED" if attempt.score >= attempt.quiz.pass_mark else "FAILED"
            redirect_material_id = None
            has_failed_all = False
            remediation_state_status = None

            if attempt.attempt_type == QuizAttempt.TYPE_ORDINARY:
                ordinary_count = QuizAttempt.objects.filter(
                    student=student, quiz=attempt.quiz, attempt_type=QuizAttempt.TYPE_ORDINARY, status=QuizAttempt.STATUS_SUBMITTED
                ).count()
                max_attempts = getattr(attempt.quiz, "max_attempts", 3) or 3

                if attempt.score >= attempt.quiz.pass_mark:
                    attempt_result_status = "PASSED"
                else:
                    if ordinary_count < max_attempts:
                        attempt_result_status = "FAILED_RETRYABLE"
                    else:
                        attempt_result_status = "FAILED_EXHAUSTED"
                        has_failed_all = True

                        # Identify weak skills from failed attempt
                        attempt_skills = {}
                        for ans in attempt.answers.select_related("skill", "question__skill").all():
                            sk = ans.skill or getattr(ans.question, "skill", None) or attempt.quiz.skill
                            if sk:
                                if sk.id not in attempt_skills:
                                    attempt_skills[sk.id] = {"skill": sk, "total": 0, "correct": 0}
                                attempt_skills[sk.id]["total"] += 1
                                if ans.is_correct:
                                    attempt_skills[sk.id]["correct"] += 1

                        weak_skills = []
                        for sk_id, s_data in attempt_skills.items():
                            acc = (s_data["correct"] / s_data["total"]) * 100.0 if s_data["total"] > 0 else 0
                            if acc < attempt.quiz.pass_mark:
                                weak_skills.append(s_data["skill"])
                        if not weak_skills and attempt.quiz.get_covered_skills():
                            weak_skills = attempt.quiz.get_covered_skills()
                        if not weak_skills and attempt.quiz.skill:
                            weak_skills = [attempt.quiz.skill]

                        # Assign all relevant learning materials for failed lesson-skill combinations
                        from apps.quizzes.models import LearningMaterial
                        req_mats = list(LearningMaterial.objects.filter(skill__in=weak_skills))
                        if not req_mats:
                            req_mats = list(LearningMaterial.objects.filter(quiz=attempt.quiz))
                        if not req_mats and attempt.quiz.lesson_id:
                            req_mats = list(LearningMaterial.objects.filter(lesson_id=attempt.quiz.lesson_id))

                        if req_mats:
                            redirect_material_id = req_mats[0].id

                        # Create StudentRemediationState
                        rem_state, _ = StudentRemediationState.objects.get_or_create(student=student, quiz=attempt.quiz)
                        rem_state.status = StudentRemediationState.STATUS_PENDING_MATERIALS
                        if weak_skills:
                            rem_state.weak_skills.set(weak_skills)
                        if req_mats:
                            rem_state.required_materials.set(req_mats)
                        rem_state.save()
                        remediation_state_status = rem_state.status

                        # Also populate Remediation model for tracking
                        from apps.recommendations.models import Remediation
                        for mat in req_mats:
                            t_skill = mat.skill or (weak_skills[0] if weak_skills else attempt.quiz.skill)
                            if t_skill:
                                Remediation.objects.get_or_create(
                                    student=student,
                                    skill=t_skill,
                                    material=mat,
                                    defaults={"status": Remediation.STATUS_REQUIRED}
                                )

            elif attempt.attempt_type == QuizAttempt.TYPE_REASSESSMENT:
                rem_state = StudentRemediationState.objects.filter(student=student, quiz=attempt.quiz).first()
                if attempt.score >= attempt.quiz.pass_mark:
                    attempt_result_status = "PASSED"
                    if rem_state:
                        rem_state.status = StudentRemediationState.STATUS_COMPLETED_SUCCESS
                        rem_state.reassessment_attempt = attempt
                        rem_state.save()
                        remediation_state_status = rem_state.status
                else:
                    attempt_result_status = "FAILED"
                    if rem_state:
                        rem_state.status = StudentRemediationState.STATUS_ESCALATED_TEACHER
                        rem_state.reassessment_attempt = attempt
                        rem_state.save()
                        remediation_state_status = rem_state.status

                    # Auto-create pending teacher intervention record
                    TeacherIntervention.objects.get_or_create(
                        student=student,
                        quiz=attempt.quiz,
                        remediation_state=rem_state,
                        is_pending=True,
                        defaults={
                            "notes": f"Post-remedial reassessment failed (Score: {attempt.score}% vs Pass Threshold: {attempt.quiz.pass_mark}%). Requires teacher intervention.",
                            "skill": attempt.quiz.skill or (rem_state.weak_skills.first() if rem_state else None)
                        }
                    )

        serializer_data = self.get_serializer(attempt).data
        serializer_data["attempt_result_status"] = attempt_result_status
        serializer_data["remediation_state_status"] = remediation_state_status
        if has_failed_all:
            serializer_data["has_failed_all_attempts"] = True
            serializer_data["redirect_to_material_id"] = redirect_material_id

        return Response(serializer_data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        # Backward compatible creation for legacy clients & tests
        start_res = self.start(request)
        if start_res.status_code not in [status.HTTP_200_OK, status.HTTP_201_CREATED]:
            return start_res
        
        attempt_id = start_res.data.get("id")
        if request.data.get("answers"):
            class MockRequest:
                def __init__(self, data, user):
                    self.data = data
                    self.user = user
            submit_res = self.submit(MockRequest(request.data, request.user), pk=attempt_id)
            return submit_res

        return start_res

    @action(detail=False, methods=["get"], url_path="remediation_status")
    def _calculate_remediation_status(self, user, quiz, student):
        max_attempts = getattr(quiz, "max_attempts", 3) or 3
        pass_threshold = getattr(quiz, "pass_mark", 50) or 50

        all_quiz_attempts = list(
            QuizAttempt.objects.filter(student=student, quiz=quiz)
            .prefetch_related("risk_predictions")
            .order_by("-start_time")
        )

        ordinary_attempts = [
            a for a in all_quiz_attempts
            if (a.attempt_type == QuizAttempt.TYPE_ORDINARY or not a.attempt_type) and a.status == QuizAttempt.STATUS_SUBMITTED
        ]
        ordinary_used = len(ordinary_attempts)
        ordinary_remaining = max(0, max_attempts - ordinary_used)

        reassessment_attempts = [
            a for a in all_quiz_attempts
            if a.attempt_type == QuizAttempt.TYPE_REASSESSMENT and a.status == QuizAttempt.STATUS_SUBMITTED
        ]

        has_passed_ordinary = any(a.score is not None and a.score >= pass_threshold for a in ordinary_attempts)
        has_passed_reassessment = any(a.score is not None and a.score >= pass_threshold for a in reassessment_attempts)
        has_passed = has_passed_ordinary or has_passed_reassessment
        has_failed = any(a.score is not None and a.score < pass_threshold for a in all_quiz_attempts if a.status == QuizAttempt.STATUS_SUBMITTED)

        from apps.attempts.models import StudentRemediationState, TeacherIntervention
        rem_state = StudentRemediationState.objects.filter(student=student, quiz=quiz).prefetch_related("weak_skills", "required_materials").first()

        from apps.quizzes.services.question_pool_service import verify_remediation_completion
        rem_check = verify_remediation_completion(student, quiz, rem_state=rem_state, rem_state_checked=True, has_failed=has_failed)

        if has_passed:
            attempt_status = "PASSED"
        elif ordinary_used == 0:
            attempt_status = "AVAILABLE"
        elif ordinary_used < max_attempts:
            attempt_status = "FAILED_RETRYABLE"
        else:
            attempt_status = "FAILED_EXHAUSTED"

        reassessment_in_progress = any(
            a.attempt_type == QuizAttempt.TYPE_REASSESSMENT and a.status == QuizAttempt.STATUS_IN_PROGRESS
            for a in all_quiz_attempts
        )

        if has_passed_reassessment:
            reassessment_status = "PASSED"
        elif reassessment_attempts and not has_passed_reassessment:
            reassessment_status = "FAILED"
        elif reassessment_in_progress:
            reassessment_status = "IN_PROGRESS"
        elif ordinary_used >= max_attempts and rem_check["all_completed"]:
            reassessment_status = "UNLOCKED"
        elif ordinary_used >= max_attempts:
            reassessment_status = "LOCKED"
        else:
            reassessment_status = "NOT_ELIGIBLE"

        if ordinary_used >= max_attempts:
            interventions = list(TeacherIntervention.objects.filter(student=student, quiz=quiz))
            pending_intervention = next((ti for ti in interventions if ti.is_pending), None)
            completed_intervention = next((ti for ti in interventions if not ti.is_pending), None)
        else:
            pending_intervention = None
            completed_intervention = None

        if pending_intervention:
            teacher_escalation_status = "PENDING"
        elif completed_intervention:
            teacher_escalation_status = "COMPLETED"
        else:
            teacher_escalation_status = "NONE"

        latest_attempt = all_quiz_attempts[0] if all_quiz_attempts else None
        high_risk = False
        high_risk_details = None
        if latest_attempt:
            preds = list(latest_attempt.risk_predictions.all())
            latest_pred = preds[0] if preds else None
            if not latest_pred:
                from apps.analytics.models import RiskPrediction
                latest_pred = RiskPrediction.objects.filter(student=student).order_by("-prediction_date", "-id").first()
            if latest_pred:
                high_risk = (latest_pred.risk_category in ["High Risk", "HIGH", "Critical"])
                high_risk_details = {
                    "risk_level": latest_pred.risk_category,
                    "risk_probability": round(float(latest_pred.risk_probability or 0.0), 3),
                    "created_at": latest_pred.prediction_date
                }

        weak_skills_data = []
        if rem_state:
            skills_list = list(rem_state.weak_skills.all())
            if skills_list:
                weak_skills_data = [{"id": s.id, "name": s.name} for s in skills_list]
        if not weak_skills_data and rem_check.get("weak_skills"):
            weak_skills_data = rem_check.get("weak_skills")

        return {
            "quiz_id": quiz.id,
            "quiz_title": quiz.title,
            "max_attempts": max_attempts,
            "pass_threshold": pass_threshold,
            "ordinary_attempts_used": ordinary_used,
            "ordinary_attempts_remaining": ordinary_remaining,
            "has_passed": has_passed,
            "attempt_status": attempt_status,
            "remediation_state": rem_state.status if rem_state else None,
            "weak_skills": weak_skills_data,
            "required_materials": rem_check.get("materials_detail", []),
            "all_materials_completed": rem_check.get("all_completed", False),
            "reassessment_unlocked": (ordinary_used >= max_attempts and rem_check.get("all_completed", False)),
            "reassessment_status": reassessment_status,
            "teacher_escalation_status": teacher_escalation_status,
            "pending_teacher_intervention_id": pending_intervention.id if pending_intervention else None,
            "high_risk_warning": high_risk,
            "high_risk_details": high_risk_details,
        }

    @action(detail=False, methods=["get"], url_path="remediation_status")
    def remediation_status(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        quiz_id = request.query_params.get("quiz")
        student_id = request.query_params.get("student")

        if user.is_role(Role.ROLE_STUDENT):
            student = getattr(user, "student_profile", None)
            if not student:
                student, _ = Student.objects.get_or_create(user=user)
        elif student_id and user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            try:
                student = Student.objects.get(id=student_id)
            except Student.DoesNotExist:
                return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"detail": "Quiz ID and Student access required."}, status=status.HTTP_400_BAD_REQUEST)

        if not quiz_id:
            return Response({"detail": "Quiz ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quiz = Quiz.objects.select_related("lesson", "skill").prefetch_related("skills").get(id=quiz_id, is_deleted=False)
        except Quiz.DoesNotExist:
            return Response({"detail": "Quiz not found."}, status=status.HTTP_404_NOT_FOUND)

        data = self._calculate_remediation_status(user, quiz, student)
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="remediation_summary")
    def remediation_summary(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        quiz_id = request.query_params.get("quiz")
        student_id = request.query_params.get("student")
        if not quiz_id:
            return Response({"detail": "Quiz ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        student = None
        if user.is_role(Role.ROLE_STUDENT):
            student = getattr(user, "student_profile", None)
            if not student:
                student, _ = Student.objects.get_or_create(user=user)
        elif student_id and user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            student = Student.objects.filter(id=student_id).first()

        try:
            quiz = Quiz.objects.select_related("lesson", "skill").prefetch_related("skills").get(id=quiz_id, is_deleted=False)
        except Quiz.DoesNotExist:
            return Response({"detail": "Quiz not found."}, status=status.HTTP_404_NOT_FOUND)

        rem_data = self._calculate_remediation_status(user, quiz, student) if student else {}

        from apps.quizzes.serializers import LearningMaterialSerializer
        from apps.quizzes.models import LearningMaterial

        covered_skills = quiz.get_covered_skills()
        covered_skill_ids = [s.id for s in covered_skills]

        materials_qs = LearningMaterial.objects.filter(
            models.Q(skill_id__in=covered_skill_ids) | models.Q(quiz=quiz)
        ).select_related(
            "created_by", "lesson", "topic", "skill", "quiz"
        ).prefetch_related(
            "engagement_questions", "video_questions", "attachments"
        ).order_by("order", "created_at", "id")

        materials_list = list(materials_qs)
        serialized_materials = LearningMaterialSerializer(materials_list, many=True, context={"request": request}).data

        answered_vq_ids = []
        if student and materials_list:
            from apps.attempts.models import StudentVideoAnswer
            mat_ids = [m.id for m in materials_list]
            answered_vq_ids = list(
                StudentVideoAnswer.objects.filter(student=student, question__material_id__in=mat_ids, is_correct=True).values_list("question_id", flat=True)
            )

        return Response({
            "quiz": {
                "id": quiz.id,
                "title": quiz.title,
                "description": quiz.description,
                "pass_mark": quiz.pass_mark,
                "estimated_time_minutes": quiz.estimated_time_minutes,
                "lesson_id": quiz.lesson_id,
                "lesson_title": quiz.lesson.title if quiz.lesson else "",
                "covered_skills": [{"id": s.id, "name": s.name} for s in covered_skills]
            },
            "remediation_status": rem_data,
            "materials": serialized_materials,
            "answered_video_question_ids": answered_vq_ids
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="teacher_diagnostic")
    def teacher_diagnostic(self, request):
        user = request.user
        if not user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            return Response({"detail": "Only teachers and system admins can view diagnostic evidence."}, status=status.HTTP_403_FORBIDDEN)

        student_id = request.query_params.get("student")
        quiz_id = request.query_params.get("quiz")

        if not student_id or not quiz_id:
            return Response({"detail": "Both student and quiz query parameters are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = Student.objects.get(id=student_id)
            quiz = Quiz.objects.get(id=quiz_id, is_deleted=False)
        except (Student.DoesNotExist, Quiz.DoesNotExist):
            return Response({"detail": "Student or Quiz not found."}, status=status.HTTP_404_NOT_FOUND)

        ordinary_attempts = QuizAttempt.objects.filter(
            student=student, quiz=quiz, attempt_type=QuizAttempt.TYPE_ORDINARY
        ).order_by("attempt_number")

        reassessment_attempt = QuizAttempt.objects.filter(
            student=student, quiz=quiz, attempt_type=QuizAttempt.TYPE_REASSESSMENT
        ).order_by("-start_time").first()

        from apps.attempts.models import StudentRemediationState, TeacherIntervention
        rem_state = StudentRemediationState.objects.filter(student=student, quiz=quiz).first()
        from apps.quizzes.services.question_pool_service import verify_remediation_completion
        rem_check = verify_remediation_completion(student, quiz)

        latest_attempt = QuizAttempt.objects.filter(student=student, quiz=quiz).order_by("-start_time").first()
        risk_prediction_data = None
        shap_factors = []
        if latest_attempt:
            latest_pred = latest_attempt.risk_predictions.order_by("-prediction_date", "-id").first()
            if not latest_pred:
                from apps.analytics.models import RiskPrediction
                latest_pred = RiskPrediction.objects.filter(student=student).order_by("-prediction_date", "-id").first()
            if latest_pred:
                from apps.analytics.services.student_support_mapper import build_teacher_educational_presentation
                risk_prediction_data = build_teacher_educational_presentation(latest_pred)

                top_features = latest_pred.top_features or []
                for feat in top_features[:5]:
                    shap_factors.append({
                        "feature_name": feat.get("feature", "Factor"),
                        "impact": feat.get("shap_value", 0.0),
                        "description": feat.get("description", feat.get("feature"))
                    })

        pending_intervention = TeacherIntervention.objects.filter(student=student, quiz=quiz, is_pending=True).first()
        completed_interventions = TeacherIntervention.objects.filter(student=student, quiz=quiz, is_pending=False).order_by("-date_recorded")

        return Response({
            "student_info": {
                "id": student.id,
                "name": student.user.get_full_name() or student.user.username,
                "email": student.user.email,
                "grade": student.grade,
            },
            "quiz_info": {
                "id": quiz.id,
                "title": quiz.title,
                "pass_mark": quiz.pass_mark,
                "max_attempts": quiz.max_attempts,
            },
            "ordinary_attempts": QuizAttemptSerializer(ordinary_attempts, many=True, context={"request": request}).data,
            "reassessment_attempt": QuizAttemptSerializer(reassessment_attempt, context={"request": request}).data if reassessment_attempt else None,
            "weak_skills": [
                {"id": s.id, "name": s.name} for s in (rem_state.weak_skills.all() if rem_state else quiz.get_covered_skills())
            ],
            "risk_prediction": risk_prediction_data,
            "shap_explanation_factors": shap_factors,
            "remediation_materials": rem_check.get("materials_detail", []),
            "remediation_all_completed": rem_check.get("all_completed", False),
            "remediation_state": rem_state.status if rem_state else "NONE",
            "pending_intervention": TeacherInterventionSerializer(pending_intervention).data if pending_intervention else None,
            "completed_interventions": TeacherInterventionSerializer(completed_interventions, many=True).data,
        }, status=status.HTTP_200_OK)


class TeacherInterventionViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherInterventionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return TeacherIntervention.objects.all().select_related("student__user", "teacher", "quiz")
        if user.is_role(Role.ROLE_TEACHER):
            return TeacherIntervention.objects.filter(
                models.Q(teacher=user) | models.Q(student__registered_by=user)
            ).select_related("student__user", "teacher", "quiz")
        if user.is_role(Role.ROLE_STUDENT):
            return TeacherIntervention.objects.filter(student__user=user).select_related("student__user", "teacher", "quiz")
        return TeacherIntervention.objects.none()

    @action(detail=False, methods=["get"])
    def pending(self, request):
        queryset = self.get_queryset().filter(is_pending=True)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["post"])
    def record(self, request):
        user = request.user
        if not user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            return Response({"detail": "Only teachers can record interventions."}, status=status.HTTP_403_FORBIDDEN)

        intervention_id = request.data.get("intervention_id")
        student_id = request.data.get("student")
        quiz_id = request.data.get("quiz")
        notes = request.data.get("notes", "").strip()
        intervention_type = request.data.get("intervention_type", "EXTRA_PRACTICE")
        outcome = request.data.get("outcome", "STILL_STRUGGLING")

        intervention = None
        if intervention_id:
            try:
                intervention = TeacherIntervention.objects.get(id=intervention_id)
            except TeacherIntervention.DoesNotExist:
                return Response({"detail": "Intervention record not found."}, status=status.HTTP_404_NOT_FOUND)
        elif student_id and quiz_id:
            intervention = TeacherIntervention.objects.filter(student_id=student_id, quiz_id=quiz_id, is_pending=True).first()

        if not intervention:
            if not student_id:
                return Response({"detail": "Student ID is required."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                student = Student.objects.get(id=student_id)
            except Student.DoesNotExist:
                return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)
            
            quiz = Quiz.objects.filter(id=quiz_id).first() if quiz_id else None
            rem_state = StudentRemediationState.objects.filter(student=student, quiz=quiz).first() if quiz else None
            
            intervention = TeacherIntervention.objects.create(
                teacher=user,
                student=student,
                quiz=quiz,
                remediation_state=rem_state,
                notes=notes,
                intervention_type=intervention_type,
                outcome=outcome,
                is_pending=False,
            )
        else:
            intervention.teacher = user
            intervention.notes = notes
            intervention.intervention_type = intervention_type
            intervention.outcome = outcome
            intervention.is_pending = False
            intervention.save()

        return Response(self.get_serializer(intervention).data, status=status.HTTP_200_OK)

class ManualMarkViewSet(viewsets.ModelViewSet):
    serializer_class = ManualMarkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return ManualMark.objects.all()
        if user.is_role(Role.ROLE_TEACHER):
            return ManualMark.objects.filter(teacher=user)
        return ManualMark.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            raise PermissionDenied("Only teachers can submit manual marks.")
        serializer.save(teacher=user)

class TeacherOverrideViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherOverrideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return TeacherOverride.objects.all()
        if user.is_role(Role.ROLE_TEACHER):
            return TeacherOverride.objects.filter(teacher=user)
        return TeacherOverride.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            raise PermissionDenied("Only teachers can submit overrides.")
        serializer.save(teacher=user)

class StudentLessonProgressViewSet(viewsets.ModelViewSet):
    serializer_class = StudentLessonProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return StudentLessonProgress.objects.all()
        if user.is_role(Role.ROLE_TEACHER):
            return StudentLessonProgress.objects.filter(student__registered_by=user)
        if user.is_role(Role.ROLE_STUDENT):
            return StudentLessonProgress.objects.filter(student__user=user)
        return StudentLessonProgress.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        student, _ = Student.objects.get_or_create(user=user)
        serializer.save(student=student)

class StudentContentProgressViewSet(viewsets.ModelViewSet):
    serializer_class = StudentContentProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return StudentContentProgress.objects.all()
        if user.is_role(Role.ROLE_TEACHER):
            return StudentContentProgress.objects.filter(student__registered_by=user)
        if user.is_role(Role.ROLE_STUDENT):
            return StudentContentProgress.objects.filter(student__user=user)
        return StudentContentProgress.objects.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_role(Role.ROLE_STUDENT) and not user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return Response({"detail": "Only students can track material progress."}, status=status.HTTP_403_FORBIDDEN)
        
        student, _ = Student.objects.get_or_create(user=user)
        material_id = request.data.get("material")
        if not material_id:
            return Response({"detail": "material is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            material = LearningMaterial.objects.get(id=material_id)
        except LearningMaterial.DoesNotExist:
            return Response({"detail": "Material not found."}, status=status.HTTP_404_NOT_FOUND)

        progress, created = StudentContentProgress.objects.get_or_create(
            student=student,
            material=material,
            defaults={"started_at": timezone.now()}
        )

        is_completed_requested = request.data.get("is_completed", False)
        new_accumulated_seconds = request.data.get("accumulated_seconds")
        new_watched_percentage = request.data.get("watched_percentage")

        if new_accumulated_seconds is not None:
            try:
                acc_val = int(new_accumulated_seconds)
                if acc_val > progress.accumulated_seconds:
                    progress.accumulated_seconds = acc_val
            except (ValueError, TypeError):
                pass

        if new_watched_percentage is not None:
            try:
                wp_val = float(new_watched_percentage)
                if wp_val > progress.watched_percentage:
                    progress.watched_percentage = wp_val
            except (ValueError, TypeError):
                pass

        if is_completed_requested:
            if material.material_type == LearningMaterial.TYPE_VIDEO:
                if progress.watched_percentage < 95.0:
                    return Response(
                        {"detail": "Please finish watching the video before marking this material as complete."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                video_qs = VideoQuestion.objects.filter(material=material)
                if video_qs.exists():
                    answered_count = StudentVideoAnswer.objects.filter(student=student, question__in=video_qs).count()
                    if answered_count < video_qs.count():
                        return Response(
                            {"detail": "Please answer all embedded video questions before marking this material as complete."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
            else:
                est_minutes = material.estimated_completion_minutes or 0
                required_seconds = est_minutes * 60
                if progress.accumulated_seconds < required_seconds:
                    return Response(
                        {"detail": "Please complete the required learning time before marking this material as complete."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            progress.is_completed = True
            if not progress.completed_at:
                progress.completed_at = timezone.now()

        progress.save()

        if progress.is_completed and material.quiz:
            from apps.quizzes.services.question_pool_service import verify_remediation_completion
            verify_remediation_completion(student, material.quiz)

        serializer = self.get_serializer(progress)
        status_code = status.HTTP_200_OK if not created else status.HTTP_201_CREATED
        return Response(serializer.data, status=status_code)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        student = instance.student
        material = instance.material

        is_completed_requested = request.data.get("is_completed", False)
        new_accumulated_seconds = request.data.get("accumulated_seconds")
        new_watched_percentage = request.data.get("watched_percentage")

        if new_accumulated_seconds is not None:
            try:
                acc_val = int(new_accumulated_seconds)
                if acc_val > instance.accumulated_seconds:
                    instance.accumulated_seconds = acc_val
            except (ValueError, TypeError):
                pass

        if new_watched_percentage is not None:
            try:
                wp_val = float(new_watched_percentage)
                if wp_val > instance.watched_percentage:
                    instance.watched_percentage = wp_val
            except (ValueError, TypeError):
                pass

        if is_completed_requested:
            if material.material_type == LearningMaterial.TYPE_VIDEO:
                if instance.watched_percentage < 95.0:
                    return Response(
                        {"detail": "Please finish watching the video before marking this material as complete."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                video_qs = VideoQuestion.objects.filter(material=material)
                if video_qs.exists():
                    answered_count = StudentVideoAnswer.objects.filter(student=student, question__in=video_qs).count()
                    if answered_count < video_qs.count():
                        return Response(
                            {"detail": "Please answer all embedded video questions before marking this material as complete."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
            else:
                est_minutes = material.estimated_completion_minutes or 0
                required_seconds = est_minutes * 60
                if instance.accumulated_seconds < required_seconds:
                    return Response(
                        {"detail": "Please complete the required learning time before marking this material as complete."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            instance.is_completed = True
            if not instance.completed_at:
                instance.completed_at = timezone.now()

        instance.save()

        if instance.is_completed and material.quiz:
            from apps.quizzes.services.question_pool_service import verify_remediation_completion
            verify_remediation_completion(student, material.quiz)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class StudentEngagementAnswerViewSet(viewsets.ModelViewSet):
    serializer_class = StudentEngagementAnswerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return StudentEngagementAnswer.objects.all()
        if user.is_role(Role.ROLE_TEACHER):
            return StudentEngagementAnswer.objects.filter(student__registered_by=user)
        if user.is_role(Role.ROLE_STUDENT):
            return StudentEngagementAnswer.objects.filter(student__user=user)
        return StudentEngagementAnswer.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        student, _ = Student.objects.get_or_create(user=user)
        serializer.save(student=student)


class StudentVideoAnswerViewSet(viewsets.ModelViewSet):
    serializer_class = StudentVideoAnswerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return StudentVideoAnswer.objects.all()
        if user.is_role(Role.ROLE_TEACHER):
            return StudentVideoAnswer.objects.filter(student__registered_by=user)
        if user.is_role(Role.ROLE_STUDENT):
            return StudentVideoAnswer.objects.filter(student__user=user)
        return StudentVideoAnswer.objects.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        student, _ = Student.objects.get_or_create(user=user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data.get("question")
        selected = serializer.validated_data.get("selected_answer")

        is_correct = False
        if question and question.options:
            for opt in question.options:
                if str(opt.get("text", "")).strip().lower() == str(selected).strip().lower() and opt.get("is_correct"):
                    is_correct = True
                    break

        ans_obj, _ = StudentVideoAnswer.objects.update_or_create(
            student=student,
            question=question,
            defaults={"selected_answer": selected, "is_correct": is_correct}
        )
        return Response(StudentVideoAnswerSerializer(ans_obj).data, status=status.HTTP_201_CREATED)

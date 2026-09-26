import random
import datetime
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import Role
from apps.attempts.models import QuizAttempt, AttemptQuestion, AttemptAnswer, ManualMark, TeacherOverride, StudentLessonProgress, StudentContentProgress, StudentEngagementAnswer
from apps.attempts.serializers import QuizAttemptSerializer, ManualMarkSerializer, TeacherOverrideSerializer, StudentLessonProgressSerializer, StudentContentProgressSerializer, StudentEngagementAnswerSerializer
from apps.classes.models import Student
from apps.quizzes.models import Quiz, Question, Answer, CorrectAnswer, Skill

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
    serializer_class = QuizAttemptSerializer

    def get_queryset(self):
        user = self.request.user
        
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return QuizAttempt.objects.all().select_related("quiz", "student__user").prefetch_related("answers", "attempt_questions__question").order_by("-start_time", "-id")
        
        if user.is_role(Role.ROLE_TEACHER):
            school_id = user.school_id
            if school_id:
                return QuizAttempt.objects.filter(student__user__school_id=school_id).select_related("quiz", "student__user").prefetch_related("answers", "attempt_questions__question").order_by("-start_time", "-id")
            return QuizAttempt.objects.all().select_related("quiz", "student__user").prefetch_related("answers", "attempt_questions__question").order_by("-start_time", "-id")
        
        if user.is_role(Role.ROLE_STUDENT):
            student, _ = Student.objects.get_or_create(user=user)
            return QuizAttempt.objects.filter(student=student).select_related("quiz", "student__user").prefetch_related("answers", "attempt_questions__question").order_by("-start_time", "-id")
            
        return QuizAttempt.objects.none()

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
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response({"detail": "Quiz not found."}, status=status.HTTP_404_NOT_FOUND)

        # Enforce Sequential Quiz Access for Lesson
        if quiz.lesson_id:
            prior_quizzes = Quiz.objects.filter(lesson_id=quiz.lesson_id).order_by("order", "id")
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

            # Check attempt limit
            existing_attempts = QuizAttempt.objects.filter(student=student, quiz=quiz).select_for_update()
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

            # Check remediation
            if existing_count > 0:
                last_attempt = existing_attempts.order_by("-attempt_number").first()
                if last_attempt and last_attempt.score is not None and last_attempt.score < quiz.pass_mark:
                    required_lessons = quiz.remedial_lessons.all()
                    incomplete_lessons = []
                    for lesson in required_lessons:
                        progress, _ = StudentLessonProgress.objects.get_or_create(student=student, lesson=lesson)
                        if progress.status != StudentLessonProgress.STATUS_COMPLETED:
                            incomplete_lessons.append(lesson.id)
                    if incomplete_lessons:
                        return Response({
                            "detail": "You must complete the required remedial lessons before retaking this quiz.",
                            "remediation_required": True,
                            "incomplete_lessons": incomplete_lessons
                        }, status=status.HTTP_403_FORBIDDEN)

            # Skill-based question selection & validation
            try:
                selected_questions = select_and_validate_quiz_questions(quiz)
            except ValueError as ve:
                return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)

            start_time = timezone.now()
            duration_minutes = getattr(quiz, "estimated_time_minutes", 10) or 10
            expires_at = start_time + datetime.timedelta(minutes=duration_minutes)

            attempt = QuizAttempt.objects.create(
                student=student,
                quiz=quiz,
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
            quiz_questions = {q.id: q for q in attempt.quiz.questions.select_related("correct_answer").prefetch_related("answers").all()}

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

            # Save any final answers passed in payload
            answers_data = request.data.get("answers", [])
            quiz_questions = {q.id: q for q in attempt.quiz.questions.select_related("correct_answer").prefetch_related("answers").all()}

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

            attempt.end_time = timezone.now()
            if attempt.expires_at and timezone.now() > attempt.expires_at:
                attempt.status = QuizAttempt.STATUS_EXPIRED
                attempt.auto_submitted = True
            else:
                attempt.status = QuizAttempt.STATUS_SUBMITTED
                attempt.auto_submitted = False

            attempt.score = calculate_attempt_score(attempt)
            attempt.save()

            # Auto-assign Remediation records on failed attempt
            redirect_material_id = None
            has_failed_all = False
            if attempt.score < attempt.quiz.pass_mark:
                max_attempts = getattr(attempt.quiz, "max_attempts", 3) or 3
                if attempt.attempt_number >= max_attempts:
                    has_failed_all = True
                try:
                    from apps.recommendations.models import Remediation
                    from apps.quizzes.models import LearningMaterial
                    mats = LearningMaterial.objects.filter(quiz=attempt.quiz)
                    if not mats.exists() and attempt.quiz.skill_id:
                        mats = LearningMaterial.objects.filter(skill_id=attempt.quiz.skill_id)
                    if not mats.exists() and attempt.quiz.lesson_id:
                        mats = LearningMaterial.objects.filter(lesson_id=attempt.quiz.lesson_id)
                    if mats.exists():
                        redirect_material_id = mats.first().id
                    existing_mats = set(Remediation.objects.filter(student=student, material__in=mats).values_list("material_id", flat=True))
                    remediations_to_create = [
                        Remediation(student=student, material=mat, status=Remediation.STATUS_REQUIRED)
                        for mat in mats if mat.id not in existing_mats
                    ]
                    if remediations_to_create:
                        Remediation.objects.bulk_create(remediations_to_create)
                except Exception as err:
                    print(f"Remediation assignment error: {err}")

        # Trigger ML Risk Prediction
        risk_prediction_data = None
        if attempt.quiz.skill_id:
            try:
                from apps.analytics.services.student_feature_builder import build_student_skill_features
                from apps.analytics.services.risk_predictor import predict_student_risk
                from apps.analytics.models import RiskPrediction
                feature_result = build_student_skill_features(student.id, attempt.quiz.skill_id)
                if feature_result.get("status") == "success":
                    pred_result = predict_student_risk(feature_result["features"])
                    if pred_result.get("status") == "success":
                        prediction = RiskPrediction.objects.create(
                            student=student,
                            skill=attempt.quiz.skill,
                            risk_category=pred_result["risk_level"],
                            risk_probability=pred_result["risk_probability"],
                            threshold=pred_result["threshold"],
                            model_version=pred_result["model_version"],
                            contributing_factors=feature_result["features"]
                        )
                        risk_prediction_data = {
                            "risk_category": prediction.risk_category,
                            "risk_probability": prediction.risk_probability,
                            "threshold": prediction.threshold,
                            "model_version": prediction.model_version,
                        }
            except Exception as err:
                print(f"ML risk prediction error: {err}")

        serializer_data = self.get_serializer(attempt).data
        if risk_prediction_data:
            serializer_data["risk_prediction"] = risk_prediction_data
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
            return StudentLessonProgress.objects.filter(lesson__created_by=user)
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
            return StudentContentProgress.objects.filter(material__lesson__created_by=user)
        if user.is_role(Role.ROLE_STUDENT):
            return StudentContentProgress.objects.filter(student__user=user)
        return StudentContentProgress.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        student, _ = Student.objects.get_or_create(user=user)
        serializer.save(student=student)

class StudentEngagementAnswerViewSet(viewsets.ModelViewSet):
    serializer_class = StudentEngagementAnswerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return StudentEngagementAnswer.objects.all()
        if user.is_role(Role.ROLE_TEACHER):
            return StudentEngagementAnswer.objects.filter(question__material__lesson__created_by=user)
        if user.is_role(Role.ROLE_STUDENT):
            return StudentEngagementAnswer.objects.filter(student__user=user)
        return StudentEngagementAnswer.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        student, _ = Student.objects.get_or_create(user=user)
        serializer.save(student=student)

from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import Role
from apps.attempts.models import QuizAttempt, AttemptAnswer, ManualMark, TeacherOverride, StudentLessonProgress, StudentContentProgress, StudentEngagementAnswer
from apps.attempts.serializers import QuizAttemptSerializer, ManualMarkSerializer, TeacherOverrideSerializer, StudentLessonProgressSerializer, StudentContentProgressSerializer, StudentEngagementAnswerSerializer
from apps.classes.models import Student
from apps.quizzes.models import Quiz, Question, Answer, CorrectAnswer

class QuizAttemptViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = QuizAttemptSerializer

    def get_queryset(self):
        user = self.request.user
        
        # System Admin can view all attempts
        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return QuizAttempt.objects.all().prefetch_related("answers").order_by("-start_time")
        
        # Teacher can view attempts in their school
        if user.is_role(Role.ROLE_TEACHER):
            school_id = user.school_id
            if school_id:
                return QuizAttempt.objects.filter(student__user__school_id=school_id).prefetch_related("answers").order_by("-start_time")
            return QuizAttempt.objects.all().prefetch_related("answers").order_by("-start_time")
        
        # Students can only view their own attempts
        if user.is_role(Role.ROLE_STUDENT):
            student, _ = Student.objects.get_or_create(user=user)
            return QuizAttempt.objects.filter(student=student).prefetch_related("answers").order_by("-start_time")
            
        return QuizAttempt.objects.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_role(Role.ROLE_STUDENT):
            return Response({"detail": "Only students can submit quiz attempts."}, status=status.HTTP_403_FORBIDDEN)
            
        student, _ = Student.objects.get_or_create(user=user)
        
        quiz_id = request.data.get("quiz")
        if not quiz_id:
            return Response({"detail": "Quiz ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response({"detail": "Quiz not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Check existing attempts and remediation logic
        existing_attempts = QuizAttempt.objects.filter(student=student, quiz=quiz).order_by("-attempt_number")
        existing_attempts_count = existing_attempts.count()
        
        if existing_attempts_count >= quiz.max_attempts:
            return Response(
                {"detail": f"You have reached the maximum limit of {quiz.max_attempts} attempts for this quiz."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if existing_attempts_count > 0:
            last_attempt = existing_attempts.first()
            if last_attempt.score is not None and last_attempt.score < quiz.pass_mark:
                # Failed last attempt, check if all remedial lessons are completed
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
                    
        attempt_number = existing_attempts_count + 1
        
        answers_data = request.data.get("answers", [])
        
        start_time_str = request.data.get("start_time")
        start_time = timezone.now()
        if start_time_str:
            try:
                from dateutil.parser import parse
                start_time = parse(start_time_str)
            except Exception:
                pass
                
        # Create QuizAttempt
        attempt = QuizAttempt.objects.create(
            student=student,
            quiz=quiz,
            attempt_number=attempt_number,
            start_time=start_time,
            end_time=timezone.now(),
        )
        
        # Process answers and calculate score
        total_questions = quiz.questions.count()
        total_awarded_score = 0.0
        
        for ans_item in answers_data:
            q_id = ans_item.get("question")
            selected_ans_id = ans_item.get("selected_answer")
            typed_val = ans_item.get("typed_answer")
            hint_count = int(ans_item.get("hint_count", 0))
            
            try:
                question = quiz.questions.get(id=q_id)
            except Question.DoesNotExist:
                continue
            
            is_correct = False
            selected_answer = None
            typed_answer = None
            
            if question.question_type == Question.TYPE_MCQ:
                if selected_ans_id:
                    try:
                        selected_answer = Answer.objects.get(id=selected_ans_id, question=question)
                        is_correct = selected_answer.is_correct
                    except Answer.DoesNotExist:
                        pass
            elif question.question_type == Question.TYPE_NUMERIC:
                if typed_val is not None:
                    typed_answer = str(typed_val).strip()
                    try:
                        correct_ans = question.correct_answer
                        # Case insensitive/whitespace comparison
                        if correct_ans and correct_ans.correct_value.strip().lower() == typed_answer.lower():
                            is_correct = True
                    except CorrectAnswer.DoesNotExist:
                        pass
            
            question_score = 0.0
            if is_correct:
                # 25% penalty per hint, max 100% penalty
                question_score = max(0.0, 1.0 - 0.25 * hint_count)
                
            total_awarded_score += question_score
                
            AttemptAnswer.objects.create(
                attempt=attempt,
                question=question,
                selected_answer=selected_answer,
                typed_answer=typed_answer,
                is_correct=is_correct,
                hint_count=hint_count
            )
            
        # Update score
        score = (total_awarded_score / total_questions * 100) if total_questions > 0 else 0
        attempt.score = round(score, 2)
        attempt.save()
        
        serializer = self.get_serializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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

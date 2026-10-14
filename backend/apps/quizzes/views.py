from rest_framework import viewsets, serializers, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.db import models, transaction

from apps.accounts.models import Role
from apps.audit.services import log_activity
from .models import EngagementQuestion, Quiz, Lesson, AcademicTerm, Topic, Skill, QuizLevel, DifficultyLevel, LearningMaterial, VideoQuestion, MaterialAttachment
from .serializers import (
    QuizSerializer, 
    QuizListSerializer,
    StudentQuizListSerializer,
    LessonSerializer, 
    AcademicTermSerializer, 
    TopicSerializer, 
    SkillSerializer, 
    QuizLevelSerializer, 
    DifficultyLevelSerializer,
    LearningMaterialSerializer,
    EngagementQuestionSerializer,
    VideoQuestionSerializer,
    MaterialAttachmentSerializer
)

class LearningMaterialViewSet(viewsets.ModelViewSet):
    queryset = LearningMaterial.objects.all().select_related(
        "created_by", "lesson", "topic", "skill", "quiz"
    ).prefetch_related(
        "engagement_questions", "video_questions", "attachments"
    ).order_by("order", "created_at", "id")
    serializer_class = LearningMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.is_role(Role.ROLE_TEACHER):
            qs = qs.filter(created_by=user)
        elif user.is_role(Role.ROLE_STUDENT):
            q_filter = models.Q(created_by__role__role_name=Role.ROLE_SYSTEM_ADMIN)
            if hasattr(user, 'student_profile') and user.student_profile.registered_by_id:
                q_filter |= models.Q(created_by_id=user.student_profile.registered_by_id)
            elif user.school_id:
                q_filter |= models.Q(school_id=user.school_id)
            qs = qs.filter(q_filter)

        lesson_id = self.request.query_params.get("lesson")
        topic_id = self.request.query_params.get("topic")
        skill_id = self.request.query_params.get("skill")
        skill_ids = self.request.query_params.get("skill_ids")
        quiz_id = self.request.query_params.get("quiz")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if skill_id:
            qs = qs.filter(skill_id=skill_id)
        if skill_ids:
            s_list = [int(x) for x in skill_ids.split(",") if x.strip().isdigit()]
            qs = qs.filter(skill_id__in=s_list)
        if quiz_id:
            try:
                quiz_obj = Quiz.objects.filter(id=quiz_id).first()
                if quiz_obj:
                    covered_skill_ids = [s.id for s in quiz_obj.get_covered_skills()]
                    qs = qs.filter(models.Q(skill_id__in=covered_skill_ids) | models.Q(quiz_id=quiz_obj.id))
                else:
                    qs = qs.filter(quiz_id=quiz_id)
            except Exception:
                qs = qs.filter(quiz_id=quiz_id)
        return qs

    def _validate_lesson_skill(self, lesson_id, skill_id):
        if lesson_id and skill_id:
            from .models import Skill
            skill = Skill.objects.filter(id=skill_id).first()
            if skill:
                skill_lesson_id = skill.lesson_id or (skill.topic.lesson_id if skill.topic else None)
                if skill_lesson_id and str(skill_lesson_id) != str(lesson_id):
                    raise serializers.ValidationError({"skill": "The selected skill does not belong to the selected lesson."})

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to create learning materials.")

        lesson = serializer.validated_data.get("lesson")
        skill = serializer.validated_data.get("skill")
        if lesson and skill:
            self._validate_lesson_skill(lesson.id, skill.id)

        if self.request.data.get("material_type") == "TEXT":
            content = self.request.data.get("content", "") or serializer.validated_data.get("content", "")
            attachments = self.request.FILES.getlist("attachments")
            if not content and not attachments:
                raise serializers.ValidationError({"content": "Either text content or at least one attachment is required for Note materials."})
                
        material = serializer.save(created_by=user)
        
        if self.request.data.get("material_type") == "TEXT":
            for f in self.request.FILES.getlist("attachments"):
                att_type = "PDF" if f.name.endswith(".pdf") or getattr(f, "content_type", "") == "application/pdf" else "IMAGE"
                MaterialAttachment.objects.create(material=material, file=f, attachment_type=att_type)

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to edit learning materials.")
            
        material = serializer.instance
        if user.is_role(Role.ROLE_TEACHER) and material.created_by != user:
            raise PermissionDenied("You do not have permission to edit this learning material.")

        lesson = serializer.validated_data.get("lesson", material.lesson)
        skill = serializer.validated_data.get("skill", material.skill)
        if lesson and skill:
            self._validate_lesson_skill(lesson.id, skill.id)

        material_type = self.request.data.get("material_type", material.material_type)
        if material_type == "TEXT":
            content = self.request.data.get("content", material.content) or serializer.validated_data.get("content", material.content)
            attachments = self.request.FILES.getlist("attachments")
            existing_count = material.attachments.count()
            if not content and existing_count == 0 and not attachments:
                raise serializers.ValidationError({"content": "Either text content or at least one attachment is required for Note materials."})
                
        serializer.save()
        
        if material_type == "TEXT":
            for f in self.request.FILES.getlist("attachments"):
                att_type = "PDF" if f.name.endswith(".pdf") or getattr(f, "content_type", "") == "application/pdf" else "IMAGE"
                MaterialAttachment.objects.create(material=material, file=f, attachment_type=att_type)

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to delete learning materials.")
        if user.is_role(Role.ROLE_TEACHER) and instance.created_by != user:
            raise PermissionDenied("You do not have permission to delete this learning material.")
        instance.delete()

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder_materials(self, request):
        user = request.user
        if not user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        ordered_ids = request.data.get("ordered_ids")
        items = request.data.get("items")

        if ordered_ids is not None and isinstance(ordered_ids, list):
            items_to_update = [{"id": mat_id, "order": idx + 1} for idx, mat_id in enumerate(ordered_ids)]
        elif items is not None and isinstance(items, list):
            items_to_update = items
        else:
            return Response({"detail": "Either 'ordered_ids' or 'items' must be provided."}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = 0
        for item in items_to_update:
            mat_id = item.get("id")
            new_order = item.get("order")
            if mat_id is not None and new_order is not None:
                mat = LearningMaterial.objects.filter(id=mat_id).first()
                if mat and (user.is_role(Role.ROLE_SYSTEM_ADMIN) or mat.created_by_id == user.id):
                    mat.order = int(new_order)
                    mat.save(update_fields=["order"])
                    updated_count += 1

        return Response({"detail": f"Updated order for {updated_count} materials."}, status=status.HTTP_200_OK)

class VideoQuestionViewSet(viewsets.ModelViewSet):
    queryset = VideoQuestion.objects.all()
    serializer_class = VideoQuestionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        material_id = self.request.query_params.get("material")
        if material_id:
            qs = qs.filter(material_id=material_id)
        return qs

class MaterialAttachmentViewSet(viewsets.ModelViewSet):
    queryset = MaterialAttachment.objects.all()
    serializer_class = MaterialAttachmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        material_id = self.request.query_params.get("material")
        if material_id:
            qs = qs.filter(material_id=material_id)
        return qs



class AcademicTermViewSet(viewsets.ModelViewSet):
    queryset = AcademicTerm.objects.all().order_by("order")
    serializer_class = AcademicTermSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can create terms.")
        term = serializer.save()
        log_activity(
            user=user,
            action="CREATE",
            entity_type="CURRICULUM",
            entity_id=term.id,
            description=f"Created academic term {term.name}"
        )

    def perform_update(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can edit terms.")
        term = serializer.save()
        log_activity(
            user=user,
            action="UPDATE",
            entity_type="CURRICULUM",
            entity_id=term.id,
            description=f"Updated academic term {term.name}"
        )

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can delete terms.")
        name = instance.name
        t_id = instance.id
        instance.delete()
        log_activity(
            user=user,
            action="DELETE",
            entity_type="CURRICULUM",
            entity_id=t_id,
            description=f"Deleted academic term {name}"
        )

class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    
    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can create topics.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("Only System Admin can edit topics.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to delete topics.")
        if instance.skills.filter(quizzes__isnull=False).exists():
            raise PermissionDenied("Cannot delete topic associated with active quizzes.")
        instance.delete()

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        topic_id = self.request.query_params.get("topic")
        lesson_id = self.request.query_params.get("lesson")
        active_only = self.request.query_params.get("active_only")
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        if active_only == "true":
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to create skills.")
        skill = serializer.save()
        lesson_title = skill.lesson.title if skill.lesson else ""
        desc = f"Added skill '{skill.name}' to {lesson_title}" if lesson_title else f"Added skill '{skill.name}'"
        log_activity(
            user=user,
            action="CREATE",
            entity_type="SKILL",
            entity_id=skill.id,
            description=desc,
            metadata={"lesson_id": skill.lesson_id, "skill_name": skill.name}
        )

    def perform_update(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to edit skills.")
        skill = serializer.save()
        lesson_title = skill.lesson.title if skill.lesson else ""
        desc = f"Updated skill '{skill.name}' in {lesson_title}" if lesson_title else f"Updated skill '{skill.name}'"
        log_activity(
            user=user,
            action="UPDATE",
            entity_type="SKILL",
            entity_id=skill.id,
            description=desc
        )

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to delete skills.")
        is_referenced = (
            instance.quizzes.exists() or 
            instance.questions.exists() or 
            instance.materials.exists() or 
            (hasattr(instance, "remediations") and instance.remediations.exists())
        )
        if is_referenced:
            raise PermissionDenied("This skill is already used by existing quizzes or learning materials and cannot be removed.")
        name = instance.name
        s_id = instance.id
        lesson_title = instance.lesson.title if instance.lesson else ""
        desc = f"Removed skill '{name}' from {lesson_title}" if lesson_title else f"Removed skill '{name}'"
        instance.delete()
        log_activity(
            user=user,
            action="DELETE",
            entity_type="SKILL",
            entity_id=s_id,
            description=desc
        )

class QuizLevelViewSet(viewsets.ModelViewSet):
    queryset = QuizLevel.objects.all().order_by("order")
    serializer_class = QuizLevelSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

class DifficultyLevelViewSet(viewsets.ModelViewSet):
    queryset = DifficultyLevel.objects.all().order_by("order")
    serializer_class = DifficultyLevelSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        term = self.request.query_params.get("term")
        grade = self.request.query_params.get("grade")
        queryset = Lesson.objects.all().select_related("created_by", "term").prefetch_related("skills").order_by("created_at")

        user = self.request.user
        if user.is_role(Role.ROLE_STUDENT):
            q_filter = models.Q(created_by__role__role_name=Role.ROLE_SYSTEM_ADMIN)
            if hasattr(user, 'student_profile') and user.student_profile.registered_by_id:
                q_filter |= models.Q(created_by_id=user.student_profile.registered_by_id)
            queryset = queryset.filter(q_filter)

        if term:
            queryset = queryset.filter(term=term)
        if grade:
            queryset = queryset.filter(grade=grade)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to create lessons.")
        lesson = serializer.save(created_by=user)
        log_activity(
            user=user,
            action="CREATE",
            entity_type="LESSON",
            entity_id=lesson.id,
            description=f"Created lesson {lesson.title}",
            metadata={"term_id": lesson.term_id, "title": lesson.title}
        )

    def perform_update(self, serializer):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to update lessons.")
        lesson = serializer.save()
        log_activity(
            user=user,
            action="UPDATE",
            entity_type="LESSON",
            entity_id=lesson.id,
            description=f"Updated lesson {lesson.title}"
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        user = request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to update lessons.")

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if "skills" in request.data and isinstance(request.data["skills"], list):
            skills_data = request.data["skills"]
            existing_skills = {s.id: s for s in instance.skills.all()}
            keep_ids = set()

            for item in skills_data:
                skill_id = item.get("id")
                name = (item.get("name") or "").strip()
                if not name:
                    continue

                if skill_id and int(skill_id) in existing_skills:
                    s_obj = existing_skills[int(skill_id)]
                    s_obj.name = name
                    if "is_active" in item:
                        s_obj.is_active = item["is_active"]
                    s_obj.save()
                    keep_ids.add(s_obj.id)
                else:
                    new_skill = Skill.objects.create(
                        lesson=instance,
                        name=name,
                        is_active=item.get("is_active", True)
                    )
                    keep_ids.add(new_skill.id)

            for s_id, s_obj in existing_skills.items():
                if s_id not in keep_ids:
                    is_referenced = (
                        s_obj.quizzes.exists() or 
                        s_obj.questions.exists() or 
                        s_obj.materials.exists() or 
                        (hasattr(s_obj, "remediations") and s_obj.remediations.exists())
                    )
                    if is_referenced:
                        raise serializers.ValidationError({
                            "detail": f"This skill '{s_obj.name}' is already used by existing quizzes or learning materials and cannot be removed."
                        })
                    s_obj.delete()

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(self.get_serializer(instance).data)

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_role(Role.ROLE_SYSTEM_ADMIN) or user.is_superuser):
            raise PermissionDenied("You do not have permission to delete lessons.")
        if instance.quizzes.exists() or instance.topics.filter(skills__quizzes__isnull=False).exists():
            raise PermissionDenied("Cannot delete lesson associated with active quizzes.")
        title = instance.title
        l_id = instance.id
        instance.delete()
        log_activity(
            user=user,
            action="DELETE",
            entity_type="LESSON",
            entity_id=l_id,
            description=f"Deleted lesson {title}"
        )

    @action(detail=True, methods=['get'], url_path='student_quizzes')
    def student_quizzes(self, request, pk=None):
        user = request.user
        lesson = self.get_object()

        from apps.classes.models import Student
        from apps.attempts.models import QuizAttempt, StudentRemediationState, StudentContentProgress, TeacherIntervention
        from apps.quizzes.services.question_pool_service import verify_remediation_completion

        student = None
        if user.is_role(Role.ROLE_STUDENT):
            student = getattr(user, "student_profile", None)
            if not student:
                student, _ = Student.objects.get_or_create(user=user)
        elif request.query_params.get("student") and user.is_role(Role.ROLE_TEACHER, Role.ROLE_SYSTEM_ADMIN):
            student = Student.objects.filter(id=request.query_params.get("student")).first()

        quizzes = list(
            Quiz.objects.filter(lesson=lesson, is_deleted=False, status="PUBLISHED")
            .annotate(question_count=models.Count("questions", distinct=True))
            .select_related("quiz_level", "difficulty", "skill", "topic")
            .order_by("lesson__order", "quiz_level__order", "difficulty__order", "order", "id")
        )

        if not quizzes:
            return Response({
                "lesson": {
                    "id": lesson.id,
                    "title": lesson.title,
                    "description": lesson.description,
                    "term_name": lesson.term.name if lesson.term else "",
                },
                "overall_progress_pct": 0,
                "completed_quizzes_count": 0,
                "total_quizzes_count": 0,
                "quizzes": []
            })

        attempts_by_quiz = {}
        rem_states_by_quiz = {}
        completed_material_ids = set()
        quiz_materials_map = {}

        if student:
            all_attempts = QuizAttempt.objects.filter(
                student=student, quiz__in=quizzes
            ).prefetch_related("risk_predictions").order_by("-start_time")

            for att in all_attempts:
                if att.quiz_id not in attempts_by_quiz:
                    attempts_by_quiz[att.quiz_id] = []
                attempts_by_quiz[att.quiz_id].append(att)

            rem_states = StudentRemediationState.objects.filter(
                student=student, quiz__in=quizzes
            ).prefetch_related("required_materials")
            for rs in rem_states:
                rem_states_by_quiz[rs.quiz_id] = rs

            any_exhausted = any(
                len([att for att in attempts_by_quiz.get(q.id, []) if (att.attempt_type == "ORDINARY" or not att.attempt_type) and att.status in ["SUBMITTED", "EXPIRED"]]) >= (q.max_attempts or 3)
                for q in quizzes
            )

            if any_exhausted or rem_states:
                # Batch fetch content progress completed IDs
                completed_material_ids = set(
                    StudentContentProgress.objects.filter(student=student, is_completed=True).values_list("material_id", flat=True)
                )

                # Batch fetch quiz learning materials
                all_quiz_materials = LearningMaterial.objects.filter(quiz__in=quizzes)
                for mat in all_quiz_materials:
                    if mat.quiz_id not in quiz_materials_map:
                        quiz_materials_map[mat.quiz_id] = []
                    quiz_materials_map[mat.quiz_id].append(mat)

        processed_quizzes = []
        for q in quizzes:
            max_attempts = q.max_attempts or 3
            pass_mark = q.pass_mark or 50

            q_attempts = attempts_by_quiz.get(q.id, [])
            ord_submitted = [att for att in q_attempts if (att.attempt_type == "ORDINARY" or not att.attempt_type) and att.status in ["SUBMITTED", "EXPIRED"]]
            reass_submitted = [att for att in q_attempts if att.attempt_type == "REASSESSMENT" and att.status in ["SUBMITTED", "EXPIRED"]]
            in_progress = any(att.status == "IN_PROGRESS" for att in q_attempts)

            ord_used = len(ord_submitted)
            ord_remaining = max(0, max_attempts - ord_used)

            passed_ord = any(att.score is not None and att.score >= pass_mark for att in ord_submitted)
            passed_reass = any(att.score is not None and att.score >= pass_mark for att in reass_submitted)
            has_passed = passed_ord or passed_reass

            latest_att = ord_submitted[0] if ord_submitted else (q_attempts[0] if q_attempts else None)
            best_score = max([att.score for att in q_attempts if att.score is not None], default=None)

            rem_state = rem_states_by_quiz.get(q.id)
            if rem_state:
                req_mats = list(rem_state.required_materials.all())
                if not req_mats:
                    req_mats = quiz_materials_map.get(q.id, [])
            else:
                req_mats = quiz_materials_map.get(q.id, [])

            all_completed = len(req_mats) == 0 or all(m.id in completed_material_ids for m in req_mats)
            rem_check = {"all_completed": all_completed, "required_materials": req_mats}

            if passed_reass:
                reass_status = "PASSED"
            elif reass_submitted and not passed_reass:
                reass_status = "FAILED"
            elif any(att.attempt_type == "REASSESSMENT" and att.status == "IN_PROGRESS" for att in q_attempts):
                reass_status = "IN_PROGRESS"
            elif ord_used >= max_attempts and rem_check["all_completed"]:
                reass_status = "UNLOCKED"
            elif ord_used >= max_attempts:
                reass_status = "LOCKED"
            else:
                reass_status = "NOT_ELIGIBLE"

            if has_passed:
                quiz_status = "PASSED"
            elif ord_used == 0:
                quiz_status = "AVAILABLE"
            elif ord_used < max_attempts:
                quiz_status = "FAILED_RETRYABLE"
            else:
                quiz_status = "FAILED_EXHAUSTED"

            high_risk = False
            high_risk_details = None
            if latest_att:
                preds = list(latest_att.risk_predictions.all())
                latest_pred = preds[0] if preds else None
                if latest_pred:
                    high_risk = latest_pred.risk_category in ["High Risk", "HIGH", "Critical"]
                    high_risk_details = {
                        "risk_level": latest_pred.risk_category,
                        "risk_probability": round(float(latest_pred.risk_probability or 0.0), 3)
                    }

            processed_quizzes.append({
                "rawQuiz": {
                    "id": q.id,
                    "title": q.title,
                    "description": q.description,
                    "lesson": q.lesson_id,
                    "order": q.order,
                    "status": q.status,
                    "quiz_level_name": q.quiz_level.name if q.quiz_level else "Beginner",
                    "difficulty_name": q.difficulty.name if q.difficulty else "Easy",
                    "pass_mark": pass_mark,
                    "max_attempts": max_attempts,
                    "estimated_time_minutes": q.estimated_time_minutes,
                },
                "id": q.id,
                "title": q.title,
                "description": q.description,
                "order": q.order or 1,
                "questionCount": getattr(q, "question_count", 10),
                "durationMinutes": q.estimated_time_minutes or 10,
                "passMark": pass_mark,
                "maxAttempts": max_attempts,
                "attemptsUsed": ord_used,
                "attemptsRemaining": ord_remaining,
                "bestScore": best_score,
                "latestScore": latest_att.score if latest_att else None,
                "latestAttemptId": latest_att.id if latest_att else None,
                "isPassed": has_passed,
                "hasInProgress": in_progress,

                "remediationState": rem_state.status if rem_state else None,
                "requiredMaterials": rem_check.get("required_materials", []),
                "allMaterialsCompleted": rem_check.get("all_completed", False),
                "reassessmentStatus": reass_status,
                "highRiskWarning": high_risk,
                "highRiskDetails": high_risk_details,

                "isUnlocked": True,
                "canRetry": (ord_used < max_attempts and not has_passed) or (reass_status == "UNLOCKED")
            })

        passed_count = sum(1 for pq in processed_quizzes if pq["isPassed"])
        total_count = len(processed_quizzes)
        overall_progress = round((passed_count / total_count) * 100) if total_count > 0 else 0

        return Response({
            "lesson": {
                "id": lesson.id,
                "title": lesson.title,
                "description": lesson.description,
                "term_name": lesson.term.name if lesson.term else "",
            },
            "overall_progress_pct": overall_progress,
            "completed_quizzes_count": passed_count,
            "total_quizzes_count": total_count,
            "quizzes": processed_quizzes
        })


def can_student_access_quiz(user, quiz):
    """
    Returns True if user (Student) is authorized to access quiz.
    Enforces:
    1. User is authenticated & is_role(Role.ROLE_STUDENT)
    2. Student profile exists with class_room
    3. quiz.status == STATUS_PUBLISHED and not deleted
    4. Quiz is assigned to student's class (assigned_class_id or assigned_classes M2M) OR created by student's teacher/admin for unassigned quizzes
    """
    if not user or not user.is_authenticated or not user.is_role(Role.ROLE_STUDENT):
        return False

    if getattr(quiz, "is_deleted", False):
        return False

    if quiz.status != "PUBLISHED":
        return False

    student = getattr(user, "student_profile", None)
    if not student:
        return False

    class_id = student.class_room_id

    # 1. Check class assignment first (Primary Authoritative Access Rule)
    has_class_assignments = quiz.assigned_class_id or quiz.assigned_classes.exists()
    if has_class_assignments:
        if class_id and (quiz.assigned_class_id == class_id or quiz.assigned_classes.filter(id=class_id).exists()):
            return True
        return False

    # 2. Fallback for unassigned global/lesson quizzes: allow if created by student's teacher or system admin
    if student.registered_by_id and quiz.created_by_id == student.registered_by_id:
        return True
    if quiz.created_by and getattr(quiz.created_by, "role", None) and quiz.created_by.role.role_name == Role.ROLE_SYSTEM_ADMIN:
        return True

    return False


class QuizViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if not request.user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            raise PermissionDenied("You do not have permission to create quizzes.")
        return super().create(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == "list":
            if self.request.user.is_authenticated and self.request.user.is_role(Role.ROLE_STUDENT):
                return StudentQuizListSerializer
            return QuizListSerializer
        return QuizSerializer

    def check_quiz_ownership(self, quiz):
        user = self.request.user
        if user.is_role(Role.ROLE_TEACHER) and quiz.created_by_id != user.id:
            raise PermissionDenied("You do not have permission to access or modify this quiz.")
        if user.is_role(Role.ROLE_STUDENT) and not can_student_access_quiz(user, quiz):
            raise PermissionDenied("You do not have permission to access this quiz.")

    def get_queryset(self):
        user = self.request.user

        if user.is_role(Role.ROLE_STUDENT):
            student_profile = getattr(user, 'student_profile', None)
            if not student_profile:
                return Quiz.objects.none()

            class_id = student_profile.class_room_id
            teacher_id = student_profile.registered_by_id

            class_q = models.Q(status="PUBLISHED") & (
                models.Q(assigned_class_id=class_id) | models.Q(assigned_classes__id=class_id)
            ) if class_id else models.Q(pk=None)

            teacher_unassigned = models.Q(status="PUBLISHED", assigned_class_id__isnull=True, assigned_classes__isnull=True) & (
                models.Q(created_by_id=teacher_id) | models.Q(created_by__role__role_name=Role.ROLE_SYSTEM_ADMIN)
            )

            q_filter = class_q | teacher_unassigned

            lesson_id = self.request.query_params.get("lesson")
            sq = Quiz.objects.filter(is_deleted=False).filter(q_filter)
            if lesson_id:
                sq = sq.filter(lesson_id=lesson_id)
            return (
                sq.annotate(annotated_question_count=models.Count("questions", distinct=True))
                .select_related("lesson", "quiz_level", "difficulty")
                .distinct()
                .order_by("lesson__order", "quiz_level__order", "difficulty__order", "order", "id")
            )

        queryset = Quiz.objects.filter(is_deleted=False).annotate(
            annotated_question_count=models.Count("questions", distinct=True)
        ).select_related(
            "created_by", "school", "lesson", "assigned_class", "quiz_level", "difficulty", "blueprint"
        )

        is_detail_action = getattr(self, "action", None) in [
            "retrieve", "update", "partial_update", "destroy", "validate_bank", "attempt_questions"
        ]
        if is_detail_action:
            queryset = queryset.prefetch_related(
                "skills", "assigned_classes", "assigned_classes__school", "assigned_classes__teacherclassroom_set__teacher",
                "questions__answers", "questions__hints", "questions__correct_answer"
            )
        else:
            queryset = queryset.prefetch_related(
                "skills", "assigned_classes", "assigned_classes__school", "assigned_classes__teacherclassroom_set__teacher"
            )

        queryset = queryset.order_by("lesson__order", "quiz_level__order", "difficulty__order", "order", "id")

        lesson_id = self.request.query_params.get("lesson")
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)

        if user.is_role(Role.ROLE_SYSTEM_ADMIN):
            return queryset

        if user.is_role(Role.ROLE_TEACHER):
            return queryset.filter(created_by=user)

        return Quiz.objects.none()

    @action(detail=False, methods=['get'])
    def check_order(self, request):
        lesson_id = request.query_params.get("lesson")
        level_id = request.query_params.get("quiz_level") or request.query_params.get("level")
        difficulty_id = request.query_params.get("difficulty")
        order_val = request.query_params.get("order")
        exclude_id = request.query_params.get("exclude_id")

        if not (lesson_id and level_id and difficulty_id and order_val):
            return Response({"exists": False})

        qs = Quiz.objects.filter(
            is_deleted=False,
            lesson_id=lesson_id,
            quiz_level_id=level_id,
            difficulty_id=difficulty_id,
            order=order_val,
            created_by=request.user,
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)

        exists = qs.exists()
        return Response({
            "exists": exists,
            "message": "A quiz already exists at this order for the selected lesson, level, and difficulty. Please choose a different order number." if exists else ""
        })

    @action(detail=True, methods=['get'])
    def validate_bank(self, request, pk=None):
        from apps.quizzes.services.question_pool_service import validate_quiz_question_bank
        quiz = self.get_object()
        self.check_quiz_ownership(quiz)
        val_result = validate_quiz_question_bank(quiz)
        if val_result["valid"]:
            return Response(val_result, status=status.HTTP_200_OK)
        return Response(val_result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def attempt_questions(self, request, pk=None):
        from apps.quizzes.serializers import QuestionSerializer
        from apps.quizzes.services.question_pool_service import select_and_allocate_attempt_questions
        from apps.classes.models import Student

        quiz = self.get_object()
        self.check_quiz_ownership(quiz)
        user = request.user
        attempt_number = int(request.query_params.get("attempt_number", 1))

        student = None
        if hasattr(user, 'student_profile') or user.is_role(Role.ROLE_STUDENT):
            student, _ = Student.objects.get_or_create(user=user)

        try:
            questions = select_and_allocate_attempt_questions(student, quiz, "ORDINARY", attempt_number)
            serializer = QuestionSerializer(questions, many=True)
            return Response(serializer.data)
        except ValueError as ve:
            return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        from rest_framework import serializers as drf_serializers
        from apps.quizzes.services.question_pool_service import validate_quiz_question_bank
        user = self.request.user
        if not user.is_role(
            Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER
        ):
            raise PermissionDenied("You do not have permission to create quizzes.")
        quiz = serializer.save(created_by=user)

        if quiz.status == "PUBLISHED":
            val_result = validate_quiz_question_bank(quiz)
            if not val_result["valid"]:
                quiz.status = "DRAFT"
                quiz.save()
                raise drf_serializers.ValidationError({
                    "detail": "Quiz cannot be published due to insufficient question bank.",
                    "question_bank_validation": val_result
                })

    def perform_update(self, serializer):
        from rest_framework import serializers as drf_serializers
        from apps.quizzes.services.question_pool_service import validate_quiz_question_bank
        user = self.request.user
        quiz = self.get_object()
        self.check_quiz_ownership(quiz)

        target_status = self.request.data.get("status", quiz.status)
        if target_status == "PUBLISHED":
            instance = serializer.save()
            val_result = validate_quiz_question_bank(instance)
            if not val_result["valid"]:
                instance.status = "DRAFT"
                instance.save()
                raise drf_serializers.ValidationError({
                    "detail": "Quiz cannot be published due to insufficient question bank.",
                    "question_bank_validation": val_result
                })
            return

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.is_role(Role.ROLE_SYSTEM_ADMIN, Role.ROLE_TEACHER):
            self.check_quiz_ownership(instance)
            instance.is_deleted = True
            instance.status = "UNPUBLISHED"
            instance.save()
        else:
            raise PermissionDenied("You do not have permission to delete quizzes.")

class EngagementQuestionViewSet(viewsets.ModelViewSet):
    queryset = EngagementQuestion.objects.all().order_by("order")
    serializer_class = EngagementQuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        material_id = self.request.query_params.get("material")
        if material_id:
            qs = qs.filter(material_id=material_id)
        return qs

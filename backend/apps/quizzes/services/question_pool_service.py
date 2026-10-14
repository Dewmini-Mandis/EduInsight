"""
Question Bank & Assessment Allocation Service
Handles:
1. Teacher question bank validation (counting eligible unique questions based on allowed attempts + reassessment).
2. Non-overlapping question set allocation per student across Attempt 1, Attempt 2, and Post-Remedial Reassessment.
3. Remedial completion verification and Post-Remedial Reassessment unlocking.
4. Baseline vs Reassessment performance comparison.
"""

import random
from typing import List, Dict, Any, Optional
from django.db import models
from apps.quizzes.models import Quiz, Question, Skill
from apps.attempts.models import QuizAttempt, AttemptQuestion, AttemptAnswer
from apps.recommendations.models import Remediation
from apps.classes.models import Student


def get_eligible_questions_for_skill(quiz: Quiz, skill: Skill):
    """
    Returns QuerySet of questions belonging to a given skill that are available for a quiz:
    - Questions created directly under this quiz for this skill (or with skill set/inherited)
    - Standalone QuestionBank questions matching the skill belonging to the quiz creator (where quiz is null)
    NEVER selects questions belonging to other or deleted quizzes.
    """
    q_filter = models.Q(quiz=quiz)
    if skill:
        q_filter &= (models.Q(skill=skill) | models.Q(skill__isnull=True))

    standalone_filter = models.Q(quiz__isnull=True)
    if skill:
        standalone_filter &= models.Q(skill=skill)
    if quiz.created_by_id:
        standalone_filter &= (models.Q(question_bank__created_by_id=quiz.created_by_id) | models.Q(question_bank__isnull=True))

    return Question.objects.filter(q_filter | standalone_filter).exclude(quiz__is_deleted=True).distinct()


def validate_quiz_question_bank(quiz: Quiz) -> Dict[str, Any]:
    """
    Validates whether the question bank has sufficient eligible unique questions to support:
    - `allowed_attempts` ordinary attempts (default 2 or quiz.max_attempts)
    - 1 reserved post-remedial reassessment
    Total required unique questions per skill = 10 * (allowed_attempts + 1)
    For a 10-question per skill assessment with 2 attempts + 1 reassessment = 30 unique questions per skill.
    """
    allowed_attempts = getattr(quiz, "max_attempts", 2) or 2
    reassessment_cycles = 1
    total_cycles = allowed_attempts + reassessment_cycles

    covered_skills = quiz.get_covered_skills()
    skill_validations = []
    errors = []

    questions_per_attempt_per_skill = 10

    if covered_skills:
        for skill in covered_skills:
            skill_qs = get_eligible_questions_for_skill(quiz, skill)
            
            required_total = questions_per_attempt_per_skill * total_cycles
            available_total = skill_qs.count()

            deficient = available_total < required_total
            missing_count = max(0, required_total - available_total)

            val_info = {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "questions_per_attempt": questions_per_attempt_per_skill,
                "allowed_attempts": allowed_attempts,
                "reassessment_cycles": reassessment_cycles,
                "required_total": required_total,
                "available": available_total,
                "deficient": deficient,
                "missing_count": missing_count,
            }

            if deficient:
                errMsg = (
                    f"Skill '{skill.name}' requires {required_total} unique questions "
                    f"({allowed_attempts} attempts + {reassessment_cycles} reassessment × {questions_per_attempt_per_skill} questions per assessment), "
                    f"but only {available_total} are available ({missing_count} more needed)."
                )
                val_info["message"] = errMsg
                errors.append(errMsg)
            else:
                val_info["message"] = f"Skill '{skill.name}' has sufficient questions ({available_total}/{required_total})."

            skill_validations.append(val_info)
    else:
        # Fallback for quiz with no skills mapped
        quiz_qs = list(quiz.questions.all())
        required_total = questions_per_attempt_per_skill * total_cycles
        available_total = len(quiz_qs)
        deficient = available_total < required_total
        missing_count = max(0, required_total - available_total)

        if deficient:
            errors.append(
                f"Quiz requires {required_total} unique questions ({allowed_attempts} attempts + 1 reassessment × {questions_per_attempt_per_skill} questions), "
                f"but only {available_total} are available ({missing_count} more needed)."
            )

    return {
        "valid": len(errors) == 0,
        "allowed_attempts": allowed_attempts,
        "reassessment_cycles": reassessment_cycles,
        "total_cycles": total_cycles,
        "skill_validations": skill_validations,
        "errors": errors,
    }


def select_and_allocate_attempt_questions(
    student: Student, quiz: Quiz, attempt_type: str = "ORDINARY", attempt_number: int = 1
) -> List[Question]:
    """
    Selects a non-overlapping question set for the student's attempt.
    For EACH selected Skill, allocates EXACTLY 10 questions.
    - Excludes any question ID already allocated to this student in prior ordinary attempts or reassessments for this quiz.
    - Preserves exact non-repetition across attempts.
    """
    # 1. Identify all question IDs previously allocated to this student for this specific quiz
    used_question_ids = set(
        AttemptQuestion.objects.filter(
            attempt__student=student, attempt__quiz=quiz, attempt__quiz__is_deleted=False
        ).values_list("question_id", flat=True)
    )

    covered_skills = quiz.get_covered_skills()
    selected_questions: List[Question] = []
    errors: List[str] = []

    questions_per_skill = 10  # EXACTLY 10 QUESTIONS PER SKILL PER ASSESSMENT

    if covered_skills:
        for skill in covered_skills:
            skill_qs = get_eligible_questions_for_skill(quiz, skill)
            unused_qs = list(skill_qs.exclude(id__in=used_question_ids))

            if len(unused_qs) < questions_per_skill:
                missing = questions_per_skill - len(unused_qs)
                errors.append(
                    f"Insufficient un-attempted questions for skill '{skill.name}'. "
                    f"Required {questions_per_skill} unused questions, but only {len(unused_qs)} remain ({missing} more needed)."
                )
            else:
                sampled = random.sample(unused_qs, questions_per_skill)
                selected_questions.extend(sampled)
                for q in sampled:
                    used_question_ids.add(q.id)
    else:
        # Fallback quiz pool
        unused_qs = list(quiz.questions.exclude(id__in=used_question_ids))
        if len(unused_qs) < questions_per_skill:
            errors.append(
                f"Insufficient un-attempted questions in quiz pool. "
                f"Required {questions_per_skill} unused questions, but only {len(unused_qs)} remain."
            )
        else:
            selected_questions = random.sample(unused_qs, questions_per_skill)

    if errors:
        raise ValueError("Validation Error: " + " ".join(errors))

    # Keep allocated question set ordered cleanly
    return selected_questions


def verify_remediation_completion(student: Student, quiz: Quiz, rem_state: Optional[Any] = None, rem_state_checked: bool = False, has_failed: Optional[bool] = None) -> Dict[str, Any]:
    """
    Verifies if all assigned Remediation materials for the student and quiz have a verified completed StudentContentProgress record (is_completed=True).
    Enforces that reassessment remains locked until every required remedial material is completed.
    """
    from apps.attempts.models import StudentContentProgress, StudentRemediationState
    from apps.quizzes.models import LearningMaterial

    if rem_state is None and not rem_state_checked:
        rem_state = StudentRemediationState.objects.filter(student=student, quiz=quiz).prefetch_related("required_materials").first()
    
    if rem_state:
        required_materials = list(rem_state.required_materials.all())
    else:
        required_materials = []

    if not required_materials:
        # Check if student even has failed attempts before querying all covered skills
        if has_failed is None:
            pass_threshold = getattr(quiz, "pass_mark", 50) or 50
            has_failed = QuizAttempt.objects.filter(student=student, quiz=quiz, score__lt=pass_threshold, status=QuizAttempt.STATUS_SUBMITTED).exists()
        if not has_failed:
            return {
                "all_completed": True,
                "total_assigned": 0,
                "completed_count": 0,
                "pending_count": 0,
                "materials_detail": [],
                "message": "No remediations required for covered skills."
            }

        skills = quiz.get_covered_skills()
        remediations = list(Remediation.objects.filter(student=student, skill__in=skills).select_related("material"))
        if remediations:
            required_materials = [r.material for r in remediations if r.material]
        else:
            required_materials = list(LearningMaterial.objects.filter(quiz=quiz))
            if not required_materials and skills:
                required_materials = list(LearningMaterial.objects.filter(skill__in=skills))

    if not required_materials:
        if rem_state and rem_state.status == StudentRemediationState.STATUS_PENDING_MATERIALS:
            rem_state.status = StudentRemediationState.STATUS_REASSESSMENT_UNLOCKED
            rem_state.save(update_fields=["status", "updated_at"])

        return {
            "all_completed": True,
            "total_assigned": 0,
            "completed_count": 0,
            "pending_count": 0,
            "materials_detail": [],
            "message": "No remediations required for covered skills."
        }

    mat_ids = [m.id for m in required_materials]
    completed_ids = set(
        StudentContentProgress.objects.filter(
            student=student, material_id__in=mat_ids, is_completed=True
        ).values_list("material_id", flat=True)
    )

    total_assigned = len(required_materials)
    completed_count = len(completed_ids)
    all_completed = completed_count == total_assigned

    materials_detail = [
        {
            "id": mat.id,
            "title": mat.title,
            "material_type": mat.material_type,
            "is_completed": mat.id in completed_ids,
        }
        for mat in required_materials
    ]

    if completed_ids:
        Remediation.objects.filter(student=student, material_id__in=completed_ids).exclude(status=Remediation.STATUS_COMPLETED).update(status=Remediation.STATUS_COMPLETED)

    if rem_state and all_completed and rem_state.status == StudentRemediationState.STATUS_PENDING_MATERIALS:
        rem_state.status = StudentRemediationState.STATUS_REASSESSMENT_UNLOCKED
        rem_state.save(update_fields=["status", "updated_at"])

    return {
        "all_completed": all_completed,
        "total_assigned": total_assigned,
        "completed_count": completed_count,
        "pending_count": total_assigned - completed_count,
        "materials_detail": materials_detail,
        "message": "All remedial materials completed." if all_completed else f"{total_assigned - completed_count} of {total_assigned} required remedial materials still pending."
    }


def calculate_reassessment_comparison(student: Student, quiz: Quiz, reassessment_attempt: QuizAttempt) -> Dict[str, Any]:
    """
    Compares baseline ordinary attempt performance with post-remedial reassessment performance.
    Calculates actual score delta and skill-level changes.
    """
    ordinary_attempts = QuizAttempt.objects.filter(
        student=student, quiz=quiz, attempt_type=QuizAttempt.TYPE_ORDINARY, status=QuizAttempt.STATUS_SUBMITTED
    ).order_by("-score")

    if not ordinary_attempts.exists():
        baseline_score = 0.0
        baseline_attempt_number = 0
    else:
        best_ordinary = ordinary_attempts.first()
        baseline_score = best_ordinary.score or 0.0
        baseline_attempt_number = best_ordinary.attempt_number

    reassessment_score = reassessment_attempt.score or 0.0
    score_delta = round(reassessment_score - baseline_score, 2)

    if score_delta > 0:
        outcome = "IMPROVED"
    elif score_delta == 0:
        outcome = "STABLE"
    else:
        outcome = "DECLINED"

    return {
        "student_id": student.id,
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "baseline_score": baseline_score,
        "baseline_attempt_number": baseline_attempt_number,
        "reassessment_score": reassessment_score,
        "score_delta": score_delta,
        "outcome": outcome,
        "passed_reassessment": reassessment_score >= quiz.pass_mark,
        "pass_mark": quiz.pass_mark,
    }

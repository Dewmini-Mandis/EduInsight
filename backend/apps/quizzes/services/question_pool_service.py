"""
Question Bank Pool Service
Retrieves distinct un-attempted questions matching a quiz's skill for initial attempt vs Reassessment 1 vs Reassessment 2.
"""
from typing import List
from apps.quizzes.models import Question, Quiz
from apps.attempts.models import AttemptAnswer, QuizAttempt


def get_questions_for_attempt(student, quiz: Quiz, attempt_number: int = 1) -> List[Question]:
    """
    Returns questions for a quiz attempt.
    Selects questions matching quiz.skill, prioritizing questions the student has not attempted before.
    """
    skill = quiz.skill
    
    # Base question set: questions attached to the quiz or matching the skill
    quiz_questions = list(quiz.questions.all())
    
    if skill:
        skill_questions = list(Question.objects.filter(skill=skill))
        # Combine preserving order
        all_pool = quiz_questions + [q for q in skill_questions if q not in quiz_questions]
    else:
        all_pool = quiz_questions

    # Identify questions student has answered in previous attempts for this quiz/skill
    previous_attempt_ids = QuizAttempt.objects.filter(student=student, quiz=quiz).values_list("id", flat=True)
    attempted_question_ids = set(
        AttemptAnswer.objects.filter(attempt_id__in=previous_attempt_ids).values_list("question_id", flat=True)
    )

    unattempted_questions = [q for q in all_pool if q.id not in attempted_question_ids]

    # If we have enough unattempted questions (>= 10 or >= len(quiz_questions)), return them
    target_count = max(len(quiz_questions), 10)
    if len(unattempted_questions) >= target_count:
        return unattempted_questions[:target_count]
    
    # Otherwise, supplement with pool questions to reach target_count
    remaining = [q for q in all_pool if q not in unattempted_questions]
    result = unattempted_questions + remaining[: (target_count - len(unattempted_questions))]
    return result

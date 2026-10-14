import numpy as np
from apps.attempts.models import AttemptAnswer

def build_features_from_answers(answers_list):
    """
    Computes the 15 exact feature metrics from a list of AttemptAnswer objects
    in chronological order.
    """
    if not answers_list:
        return None

    N = len(answers_list)
    correctness = np.array([1 if a.is_correct else 0 for a in answers_list], dtype=float)
    response_times = np.array([a.response_time if a.response_time is not None else 0.0 for a in answers_list], dtype=float)
    attempts = np.array([a.attempt_count if a.attempt_count is not None else 1 for a in answers_list], dtype=float)

    past_accuracy = float(np.mean(correctness))
    split_idx = max(1, N // 2)
    early_accuracy = float(np.mean(correctness[:split_idx]))
    recent_accuracy = float(np.mean(correctness[-split_idx:]))
    recent3_accuracy = float(np.mean(correctness[-min(3, N):]))
    improvement_rate = float(recent_accuracy - early_accuracy)

    if N > 1:
        x = np.arange(N)
        accuracy_trend = float(np.polyfit(x, correctness, 1)[0])
        response_time_trend = float(np.polyfit(x, response_times, 1)[0])
        attempt_trend = float(np.polyfit(x, attempts, 1)[0])
    else:
        accuracy_trend = 0.0
        response_time_trend = 0.0
        attempt_trend = 0.0

    correct_streak = 0
    for c in reversed(correctness):
        if c == 1:
            correct_streak += 1
        else:
            break

    wrong_streak = 0
    for c in reversed(correctness):
        if c == 0:
            wrong_streak += 1
        else:
            break

    past_avg_time = float(np.mean(response_times))
    past_median_time = float(np.median(response_times))
    recent_avg_time = float(np.mean(response_times[-split_idx:]))

    past_avg_attempts = float(np.mean(attempts))
    recent_avg_attempts = float(np.mean(attempts[-split_idx:]))

    return {
        "past_accuracy": past_accuracy,
        "early_accuracy": early_accuracy,
        "recent_accuracy": recent_accuracy,
        "recent3_accuracy": recent3_accuracy,
        "improvement_rate": improvement_rate,
        "accuracy_trend": accuracy_trend,
        "correct_streak": int(correct_streak),
        "wrong_streak": int(wrong_streak),
        "past_avg_time": past_avg_time,
        "past_median_time": past_median_time,
        "recent_avg_time": recent_avg_time,
        "response_time_trend": response_time_trend,
        "past_avg_attempts": past_avg_attempts,
        "recent_avg_attempts": recent_avg_attempts,
        "attempt_trend": attempt_trend,
    }


def build_student_skill_features(student_id, skill_id):
    """
    Builds the 15 exact features for the Junyi Academic + Engagement Gradient Boosting model
    based on the student's completed interactions for a given skill.
    Requires at least 10 valid historical interactions.
    """
    qs = AttemptAnswer.objects.filter(
        attempt__student_id=student_id,
        attempt__status="SUBMITTED"
    )
    if skill_id:
        qs = qs.filter(question__quiz__skill_id=skill_id)

    answers = list(qs.order_by("-attempt__start_time", "-id")[:10])
    if len(answers) < 10:
        return {
            "status": "insufficient_history",
            "required_interactions": 10,
            "available_interactions": len(answers)
        }

    answers.reverse()  # Chronological order
    features = build_features_from_answers(answers)

    return {
        "status": "success",
        "features": features
    }


def build_attempt_features(attempt):
    """
    Extracts the latest 10 chronological same-skill interactions for the attempt's student.
    Includes current attempt's answers and prior submitted same-skill answers.
    Requires at least 10 valid interactions; if fewer than 10 interactions exist,
    returns None (insufficient history).
    """
    skill_id = attempt.quiz.skill_id if attempt.quiz else None

    current_answers = list(attempt.answers.order_by("id"))
    all_answers_map = {a.id: a for a in current_answers}

    prior_qs = AttemptAnswer.objects.filter(
        attempt__student=attempt.student,
        attempt__status="SUBMITTED"
    )
    if skill_id:
        prior_qs = prior_qs.filter(question__quiz__skill_id=skill_id)

    for a in prior_qs.order_by("-attempt__start_time", "-id")[:10]:
        all_answers_map[a.id] = a

    answers = list(all_answers_map.values())
    if len(answers) < 10:
        return None

    # Sort chronologically by attempt start time and answer ID, take latest 10
    from django.utils import timezone
    answers.sort(key=lambda a: (a.attempt.start_time if a.attempt and a.attempt.start_time else timezone.now(), a.id))
    answers = answers[-10:]

    return build_features_from_answers(answers)

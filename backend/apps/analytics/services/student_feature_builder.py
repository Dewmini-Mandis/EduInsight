import numpy as np
from apps.attempts.models import AttemptAnswer

def build_student_skill_features(student_id, skill_id):
    """
    Builds the 15 exact features for the Junyi Academic + Engagement Gradient Boosting model
    based on the student's latest 10 completed interactions for a given skill.
    """
    # 1. Query the AttemptAnswers for the student and skill
    answers = AttemptAnswer.objects.filter(
        attempt__student_id=student_id,
        question__quiz__skill_id=skill_id
    ).order_by('-attempt__start_time', '-id')[:10]
    
    # Check if there are at least 10 interactions
    if len(answers) < 10:
        return {
            "status": "insufficient_history",
            "required_interactions": 10,
            "available_interactions": len(answers)
        }
    
    # 2. Get the latest 10 interactions chronologically
    latest_10 = list(answers)
    latest_10.reverse()  # Reverse to chronological order
    
    # Extract arrays
    correctness = np.array([1 if a.is_correct else 0 for a in latest_10])
    response_times = np.array([a.response_time if a.response_time is not None else 0 for a in latest_10])
    attempts = np.array([a.attempt_count if a.attempt_count is not None else 1 for a in latest_10])
    
    # 3. Calculate Academic Features
    past_accuracy = np.mean(correctness)
    early_accuracy = np.mean(correctness[:5])
    recent_accuracy = np.mean(correctness[-5:])
    recent3_accuracy = np.mean(correctness[-3:])
    improvement_rate = recent_accuracy - early_accuracy
    
    # Linear trend using polyfit
    x = np.arange(10)
    accuracy_trend = np.polyfit(x, correctness, 1)[0]
    
    # Streaks
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
            
    # 4. Calculate Interaction-based engagement features
    past_avg_time = np.mean(response_times)
    past_median_time = np.median(response_times)
    recent_avg_time = np.mean(response_times[-5:])
    response_time_trend = np.polyfit(x, response_times, 1)[0]
    
    past_avg_attempts = np.mean(attempts)
    recent_avg_attempts = np.mean(attempts[-5:])
    attempt_trend = np.polyfit(x, attempts, 1)[0]
    
    features = {
        "past_accuracy": float(past_accuracy),
        "early_accuracy": float(early_accuracy),
        "recent_accuracy": float(recent_accuracy),
        "recent3_accuracy": float(recent3_accuracy),
        "improvement_rate": float(improvement_rate),
        "accuracy_trend": float(accuracy_trend),
        "correct_streak": int(correct_streak),
        "wrong_streak": int(wrong_streak),
        "past_avg_time": float(past_avg_time),
        "past_median_time": float(past_median_time),
        "recent_avg_time": float(recent_avg_time),
        "response_time_trend": float(response_time_trend),
        "past_avg_attempts": float(past_avg_attempts),
        "recent_avg_attempts": float(recent_avg_attempts),
        "attempt_trend": float(attempt_trend),
    }
    
    return {
        "status": "success",
        "features": features
    }

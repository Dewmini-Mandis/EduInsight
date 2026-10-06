"""
Student Support Mapper & Teacher Educational Explanation Transformer.
Converts stored RiskPrediction & SHAP explanation data into role-appropriate presentations.
"""

CATEGORY_CONFIG = {
    "review_previous_topics": {
        "title": "Review Previous Topics",
        "message": "Some questions in your previous activities were challenging. Reviewing the related lessons may help strengthen your understanding.",
        "features": {"past_accuracy", "early_accuracy", "recent_accuracy", "recent3_accuracy"},
    },
    "strengthen_understanding": {
        "title": "Strengthen Your Understanding",
        "message": "Your recent performance shows areas that can be strengthened through regular practice and review.",
        "features": {"correct_streak", "wrong_streak", "accuracy_trend", "improvement_rate"},
    },
    "take_time_to_understand": {
        "title": "Take Time to Understand",
        "message": "Some questions took longer to answer. Revisiting the relevant concepts and practising step by step may help you respond more confidently.",
        "features": {"past_avg_time", "past_median_time", "recent_avg_time", "response_time_trend"},
    },
    "practise_difficult_questions": {
        "title": "Practise Difficult Questions",
        "message": "You needed more than one attempt to answer some questions. Try reviewing similar examples before attempting the reassessment.",
        "features": {"past_avg_attempts", "recent_avg_attempts", "attempt_trend"},
    },
}

FEATURE_TO_CATEGORY = {}
for cat_key, cfg in CATEGORY_CONFIG.items():
    for feat in cfg["features"]:
        FEATURE_TO_CATEGORY[feat] = cat_key


def _get_val(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def build_student_support_presentation(risk_pred_obj):
    """
    Transforms a RiskPrediction object into a supportive, non-punitive student presentation payload.
    Excludes all technical classification labels, risk probabilities, threshold, raw feature names,
    raw feature values, and SHAP metrics.
    """
    if not risk_pred_obj:
        return {
            "status": "guidance_unavailable",
            "display_title": "Learning Guidance",
            "summary": "Additional learning guidance is not yet available for this quiz attempt.",
            "recommendations": [],
            "next_action": {"label": "Continue Learning Path", "available": True},
            "supportive_note": "This recommendation is provided to support your learning and does not represent a final judgement of your ability."
        }

    category = _get_val(risk_pred_obj, "risk_category")
    is_high_risk = category in ["HIGH RISK", "High Risk"]

    if is_high_risk:
        status = "extra_support_recommended"
        display_title = "Extra Support Is Recommended"
        summary = "Based on your recent quiz activity, you may benefit from reviewing a few topics before attempting the next assessment. This recommendation is intended to help you improve your understanding and confidence."
        next_action_label = "Review Recommended Materials"

        explanation_data = _get_val(risk_pred_obj, "explanation_factors") or {}
        factors = explanation_data.get("factors") or explanation_data.get("all_factors") or []

        # Filter only factors that increased risk (effect == "increased_risk" or shap_value > 0)
        risk_increasing_factors = [
            f for f in factors
            if f.get("effect") == "increased_risk" or (f.get("shap_value") is not None and f.get("shap_value") > 0)
        ]

        # Group and rank categories
        category_scores = {}
        for f in risk_increasing_factors:
            feat = f.get("feature")
            cat_key = FEATURE_TO_CATEGORY.get(feat, "review_previous_topics")
            importance = f.get("abs_importance") or abs(f.get("shap_value", 0.0))
            category_scores[cat_key] = category_scores.get(cat_key, 0.0) + importance

        # Sort categories by aggregated importance descending
        sorted_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)

        recommendations = []
        for cat_key, _ in sorted_categories[:3]:  # Max 3 non-duplicated recommendations
            cfg = CATEGORY_CONFIG.get(cat_key)
            if cfg:
                recommendations.append({
                    "category": cat_key,
                    "title": cfg["title"],
                    "message": cfg["message"]
                })

        # Fallback if no specific factors increased risk
        if not recommendations:
            cfg = CATEGORY_CONFIG["review_previous_topics"]
            recommendations.append({
                "category": "review_previous_topics",
                "title": cfg["title"],
                "message": cfg["message"]
            })

    else:
        status = "making_good_progress"
        display_title = "You Are Making Good Progress"
        summary = "Your recent quiz activity indicates satisfactory progress. Continue reviewing your lessons and practising regularly to maintain your improvement."
        next_action_label = "Continue Learning Path"
        recommendations = []

    return {
        "status": status,
        "display_title": display_title,
        "summary": summary,
        "recommendations": recommendations,
        "next_action": {
            "label": next_action_label,
            "available": True
        },
        "supportive_note": "This recommendation is provided to support your learning and does not represent a final judgement of your ability."
    }


def build_teacher_educational_presentation(risk_pred_obj):
    """
    Transforms a RiskPrediction object into a teacher-friendly educational presentation payload.
    Includes official classification (High Risk / Not High Risk), probability, human-readable labels,
    and directional messages. Excludes raw SHAP numbers, base values, threshold, and system diagnostic fields.
    """
    if not risk_pred_obj:
        return None

    category = _get_val(risk_pred_obj, "risk_category")
    is_high_risk = category in ["HIGH RISK", "High Risk"]
    classification_label = "High Risk" if is_high_risk else "Not High Risk"

    explanation_data = _get_val(risk_pred_obj, "explanation_factors") or {}
    raw_factors = explanation_data.get("factors") or []

    teacher_factors = []
    for f in raw_factors:
        label = f.get("label", "")
        effect = f.get("effect", "increased_risk")
        msg = f.get("message", "")
        
        # Format teacher message to be educational and non-causal
        if "contributed to a higher risk estimate" in msg:
            msg = msg.replace("contributed to a higher risk estimate.", "contributed to a higher risk classification.")
        elif "contributed to a lower risk estimate" in msg:
            msg = msg.replace("contributed to a lower risk estimate.", "contributed to a lower risk classification.")

        teacher_factors.append({
            "label": label,
            "effect": effect,
            "message": msg
        })

    summary = (
        "The student may require additional support with the assessed skills."
        if is_high_risk
        else "The student is demonstrating satisfactory progress on the assessed skills."
    )

    pred_date = _get_val(risk_pred_obj, "prediction_date")
    prob = _get_val(risk_pred_obj, "risk_probability") or 0.0

    return {
        "risk_level": classification_label,
        "risk_category": classification_label,
        "risk_probability": round(prob * 100, 1),
        "prediction_date": pred_date.isoformat() if hasattr(pred_date, 'isoformat') else pred_date,
        "educational_explanation": {
            "summary": summary,
            "factors": teacher_factors,
        },
        "remediation_status": "Assigned" if is_high_risk else "Not Required",
        "reassessment_status": "Pending" if is_high_risk else "Satisfactory",
    }


def build_admin_technical_presentation(risk_pred_obj):
    """
    Transforms a RiskPrediction object into the System Administrator technical presentation payload.
    Includes full raw model diagnostics, threshold, feature schema, SHAP values, base value, and output space.
    """
    if not risk_pred_obj:
        return None

    category = _get_val(risk_pred_obj, "risk_category")
    is_high_risk = category in ["HIGH RISK", "High Risk"]
    classification_label = "High Risk" if is_high_risk else "Not High Risk"
    explanation_data = _get_val(risk_pred_obj, "explanation_factors") or {}
    pred_date = _get_val(risk_pred_obj, "prediction_date")
    prob = _get_val(risk_pred_obj, "risk_probability") or 0.0

    return {
        "risk_level": classification_label,
        "risk_category": classification_label,
        "risk_probability": round(prob * 100, 1),
        "threshold": _get_val(risk_pred_obj, "threshold"),
        "model_version": _get_val(risk_pred_obj, "model_version") or "junyi_academic_engagement_gb_v1",
        "prediction_date": pred_date.isoformat() if hasattr(pred_date, 'isoformat') else pred_date,
        "technical_explanation": {
            "method": _get_val(risk_pred_obj, "explanation_method") or "SHAP",
            "status": explanation_data.get("status", "unavailable" if not explanation_data.get("factors") else "available"),
            "model_version": _get_val(risk_pred_obj, "model_version") or "junyi_academic_engagement_gb_v1",
            "threshold": _get_val(risk_pred_obj, "threshold"),
            "base_value": _get_val(risk_pred_obj, "shap_base_value") if _get_val(risk_pred_obj, "shap_base_value") is not None else explanation_data.get("base_value"),
            "explainer_version": _get_val(risk_pred_obj, "explainer_version") or explanation_data.get("explainer_version", ""),
            "explained_class": "High Risk (Index 1)",
            "model_output_space": "Raw Margin (Log-Odds)",
            "summary": "Technical explanation is unavailable for this prediction." if explanation_data.get("status") == "unavailable" or not explanation_data.get("factors") else explanation_data.get("summary", "Technical SHAP factor attribution."),
            "factors": explanation_data.get("factors", []),
            "disclaimer": "These values describe how the model produced this prediction. They represent predictive contributions and should not be interpreted as causal evidence."
        }
    }

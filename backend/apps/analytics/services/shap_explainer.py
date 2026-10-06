import logging
import joblib
import numpy as np
import pandas as pd
from django.conf import settings

logger = logging.getLogger(__name__)

# Load model and feature list
MODEL_DIR = settings.BASE_DIR.parent / 'ml' / 'models'

try:
    _model = joblib.load(MODEL_DIR / 'junyi_academic_plus_engagement_gradient_boosting.pkl')
    _feature_list = joblib.load(MODEL_DIR / 'junyi_academic_plus_engagement_features.pkl')
except Exception as e:
    _model = None
    _feature_list = None
    logger.warning(f"Could not load Junyi ML model files for SHAP explainer: {e}")

# Initialize TreeExplainer once at module level
_explainer = None
_base_value = 0.0

if _model is not None:
    try:
        import shap
        _explainer = shap.TreeExplainer(_model)
        if hasattr(_explainer.expected_value, '__iter__') and not isinstance(_explainer.expected_value, str):
            _base_value = float(_explainer.expected_value[0])
        else:
            _base_value = float(_explainer.expected_value)
    except Exception as e:
        logger.error(f"Failed to initialize SHAP TreeExplainer: {e}")
        _explainer = None

# Central metadata mapping for all 15 features in exact order
FEATURE_METADATA = {
    "past_accuracy": {
        "label": "Past accuracy",
        "description": "Overall historical quiz accuracy",
        "increased_risk": "Lower historical quiz accuracy contributed to a higher risk estimate.",
        "decreased_risk": "Strong historical quiz accuracy contributed to a lower risk estimate.",
        "phrase_increased": "lower past accuracy",
        "phrase_decreased": "strong past accuracy",
    },
    "early_accuracy": {
        "label": "Early accuracy",
        "description": "Accuracy in initial attempts or early learning topics",
        "increased_risk": "Lower performance in early attempts contributed to a higher risk estimate.",
        "decreased_risk": "Solid performance in early attempts contributed to a lower risk estimate.",
        "phrase_increased": "lower early accuracy",
        "phrase_decreased": "solid early performance",
    },
    "recent_accuracy": {
        "label": "Recent accuracy",
        "description": "Accuracy in recent quiz attempts",
        "increased_risk": "Lower recent accuracy contributed to a higher risk estimate.",
        "decreased_risk": "High recent accuracy contributed to a lower risk estimate.",
        "phrase_increased": "lower recent accuracy",
        "phrase_decreased": "high recent accuracy",
    },
    "recent3_accuracy": {
        "label": "Last 3 attempts accuracy",
        "description": "Average accuracy across the last 3 quiz attempts",
        "increased_risk": "Lower average accuracy across recent attempts contributed to a higher risk estimate.",
        "decreased_risk": "Strong average accuracy across recent attempts contributed to a lower risk estimate.",
        "phrase_increased": "lower recent attempt accuracy",
        "phrase_decreased": "strong recent attempt accuracy",
    },
    "improvement_rate": {
        "label": "Improvement rate",
        "description": "Rate of performance improvement over time",
        "increased_risk": "Declining or slow improvement rate contributed to a higher risk estimate.",
        "decreased_risk": "Improving accuracy contributed to a lower risk estimate.",
        "phrase_increased": "declining improvement rate",
        "phrase_decreased": "improving accuracy rate",
    },
    "accuracy_trend": {
        "label": "Accuracy trend",
        "description": "Overall trend in accuracy scores",
        "increased_risk": "A downward trend in accuracy contributed to a higher risk estimate.",
        "decreased_risk": "An upward trend in accuracy contributed to a lower risk estimate.",
        "phrase_increased": "downward accuracy trend",
        "phrase_decreased": "upward accuracy trend",
    },
    "correct_streak": {
        "label": "Correct answer streak",
        "description": "Consecutive correct answers streak",
        "increased_risk": "A shorter correct-answer streak contributed to a higher risk estimate.",
        "decreased_risk": "A stronger correct-answer streak reduced the estimated risk.",
        "phrase_increased": "shorter correct-answer streak",
        "phrase_decreased": "stronger correct-answer streak",
    },
    "wrong_streak": {
        "label": "Incorrect answer streak",
        "description": "Consecutive incorrect answers streak",
        "increased_risk": "A longer incorrect-answer streak increased the estimated risk.",
        "decreased_risk": "A shorter incorrect-answer streak contributed to a lower risk estimate.",
        "phrase_increased": "longer incorrect-answer streak",
        "phrase_decreased": "shorter incorrect-answer streak",
    },
    "past_avg_time": {
        "label": "Past average time",
        "description": "Historical average time spent per question",
        "increased_risk": "Increasing response time per question contributed to a higher risk estimate.",
        "decreased_risk": "Efficient response time per question contributed to a lower risk estimate.",
        "phrase_increased": "higher average response time",
        "phrase_decreased": "efficient response time",
    },
    "past_median_time": {
        "label": "Past median time",
        "description": "Historical median response time per question",
        "increased_risk": "Slower median response time contributed to a higher risk estimate.",
        "decreased_risk": "Optimal median response time contributed to a lower risk estimate.",
        "phrase_increased": "slower median response time",
        "phrase_decreased": "optimal median response time",
    },
    "recent_avg_time": {
        "label": "Recent average time",
        "description": "Average time spent per question in recent attempts",
        "increased_risk": "Increasing recent response time contributed to a higher risk estimate.",
        "decreased_risk": "Consistent recent response time contributed to a lower risk estimate.",
        "phrase_increased": "increasing response time",
        "phrase_decreased": "consistent response time",
    },
    "response_time_trend": {
        "label": "Response time trend",
        "description": "Trend in time taken per question",
        "increased_risk": "Slower response time trend contributed to a higher risk estimate.",
        "decreased_risk": "Faster or steady response time trend contributed to a lower risk estimate.",
        "phrase_increased": "increasing response time trend",
        "phrase_decreased": "steady response time trend",
    },
    "past_avg_attempts": {
        "label": "Past average attempts",
        "description": "Historical average attempts needed per quiz",
        "increased_risk": "Multiple attempts needed historically contributed to a higher risk estimate.",
        "decreased_risk": "Fewer attempts needed historically contributed to a lower risk estimate.",
        "phrase_increased": "multiple attempts needed historically",
        "phrase_decreased": "fewer attempts needed historically",
    },
    "recent_avg_attempts": {
        "label": "Recent average attempts",
        "description": "Average attempts needed in recent quizzes",
        "increased_risk": "Recent multiple attempts increased the estimated risk.",
        "decreased_risk": "Single-attempt completions recently contributed to a lower risk estimate.",
        "phrase_increased": "recent multiple attempts",
        "phrase_decreased": "single-attempt completions recently",
    },
    "attempt_trend": {
        "label": "Attempt trend",
        "description": "Trend in number of attempts per quiz",
        "increased_risk": "Increasing attempts needed per quiz contributed to a higher risk estimate.",
        "decreased_risk": "Decreasing attempt count per quiz contributed to a lower risk estimate.",
        "phrase_increased": "increasing attempt count trend",
        "phrase_decreased": "decreasing attempt count trend",
    },
}


def generate_shap_explanation(features_dict, top_k=4):
    """
    Generates SHAP local explanation for the given 15-feature dictionary.
    Returns a JSON-serializable dictionary with SHAP attribution factors.
    Fails gracefully if SHAP generation encounters an issue.
    """
    if _explainer is None or _feature_list is None:
        return {
            "method": "SHAP",
            "status": "unavailable",
            "summary": "SHAP explainer is unavailable.",
            "factors": []
        }

    try:
        # Build 1-row DataFrame maintaining exact feature order
        row_dict = {}
        for feat in _feature_list:
            val = features_dict.get(feat, 0.0)
            try:
                row_dict[feat] = float(val)
            except (ValueError, TypeError):
                row_dict[feat] = 0.0
        df = pd.DataFrame([row_dict])

        # Compute SHAP values
        explanation = _explainer(df)

        # Extract values array for single sample
        # Handle shape differences: (1, 15) vs (1, 15, 2)
        raw_vals = explanation.values
        if raw_vals.ndim == 3:  # Binary classification with 2 classes output
            shap_vec = raw_vals[0, :, 1]
        elif raw_vals.ndim == 2:
            shap_vec = raw_vals[0]
        else:
            shap_vec = np.ravel(raw_vals)

        factors = []
        for i, feat in enumerate(_feature_list):
            val = float(df.iloc[0][feat])
            s_val = float(shap_vec[i])
            abs_s = abs(s_val)
            effect = "increased_risk" if s_val > 0 else "decreased_risk"

            meta = FEATURE_METADATA.get(feat, {
                "label": feat.replace("_", " ").title(),
                "description": f"Feature {feat}",
                "increased_risk": f"{feat} contributed to a higher risk estimate.",
                "decreased_risk": f"{feat} contributed to a lower risk estimate.",
                "phrase_increased": feat,
                "phrase_decreased": feat,
            })

            msg = meta["increased_risk"] if s_val > 0 else meta["decreased_risk"]

            factors.append({
                "feature": feat,
                "label": meta["label"],
                "value": round(val, 4),
                "shap_value": round(s_val, 4),
                "abs_importance": round(abs_s, 4),
                "effect": effect,
                "message": msg,
                "description": meta["description"],
            })

        # Rank factors by absolute magnitude of SHAP contribution
        factors.sort(key=lambda x: x["abs_importance"], reverse=True)

        # Select top K factors
        top_factors = factors[:min(top_k, len(factors))]

        # Construct summary sentence
        phrases = []
        for f in top_factors[:3]:
            feat = f["feature"]
            meta = FEATURE_METADATA.get(feat, {})
            phrase = meta.get("phrase_increased") if f["effect"] == "increased_risk" else meta.get("phrase_decreased")
            if phrase:
                phrases.append(phrase)

        if phrases:
            if len(phrases) == 1:
                summary_text = f"The prediction was mainly influenced by {phrases[0]}."
            elif len(phrases) == 2:
                summary_text = f"The prediction was mainly influenced by {phrases[0]} and {phrases[1]}."
            else:
                summary_text = f"The prediction was mainly influenced by {phrases[0]}, {phrases[1]}, and {phrases[2]}."
        else:
            summary_text = "Key engagement and performance indicators influenced this prediction."

        import shap
        return {
            "method": "SHAP",
            "status": "available",
            "explainer_version": f"shap_{shap.__version__}",
            "base_value": round(_base_value, 4),
            "summary": summary_text,
            "factors": top_factors,
            "all_factors": factors,
        }

    except Exception as e:
        logger.error(f"SHAP explanation generation failed: {e}", exc_info=True)
        return {
            "method": "SHAP",
            "status": "unavailable",
            "summary": "Explanation is currently unavailable for this prediction.",
            "factors": []
        }

import joblib
import pandas as pd
from django.conf import settings

# Load models exactly once at module initialization
MODEL_DIR = settings.BASE_DIR.parent / 'ml' / 'models'

try:
    _model = joblib.load(MODEL_DIR / 'junyi_academic_plus_engagement_gradient_boosting.pkl')
    _feature_list = joblib.load(MODEL_DIR / 'junyi_academic_plus_engagement_features.pkl')
    _threshold = joblib.load(MODEL_DIR / 'junyi_academic_plus_engagement_threshold.pkl')
    
    # If the threshold was saved as a single value array, extract it
    if hasattr(_threshold, '__iter__') and not isinstance(_threshold, str):
        _threshold_val = float(_threshold[0])
    else:
        _threshold_val = float(_threshold)
except Exception as e:
    _model = None
    _feature_list = None
    _threshold_val = 0.50
    print(f"Warning: Could not load Junyi ML model files: {e}")


def predict_student_risk(features_dict):
    """
    Predicts student risk using the loaded trained Junyi Gradient Boosting model.
    """
    if _model is None or _feature_list is None:
        return {
            "status": "error",
            "message": "ML model files are not loaded correctly."
        }
        
    try:
        # Create a DataFrame ensuring exact column order from _feature_list
        input_data = {feat: [features_dict.get(feat, 0.0)] for feat in _feature_list}
        df = pd.DataFrame(input_data)
        
        # Call model.predict_proba(X)
        probs = _model.predict_proba(df)
        
        # High Risk class probability (class 1 is High Risk)
        risk_probability = float(probs[0][1])
        risk_percentage = round(risk_probability * 100, 2)
        
        risk_level = "High Risk" if risk_probability >= _threshold_val else "Not High Risk"
        
        return {
            "status": "success",
            "risk_probability": risk_probability,
            "risk_percentage": risk_percentage,
            "risk_level": risk_level,
            "threshold": _threshold_val,
            "model_version": "junyi_academic_engagement_gb_v1"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Prediction failed: {str(e)}"
        }


def evaluate_and_store_attempt_risk(attempt):
    """
    Extracts features for the given finalized QuizAttempt, predicts risk using
    the trained Junyi Gradient Boosting ML model, persists the prediction and SHAP explanation
    in RiskPrediction, and returns the prediction output.
    """
    from apps.analytics.models import RiskPrediction
    from apps.analytics.services.student_feature_builder import build_attempt_features
    from apps.analytics.services.shap_explainer import generate_shap_explanation

    features = build_attempt_features(attempt)
    if not features:
        return None

    res = predict_student_risk(features)
    if res.get("status") != "success":
        return None

    risk_category = res.get("risk_level", "Not High Risk")
    risk_prob = res.get("risk_probability", 0.0)

    # Generate SHAP explanation safely
    try:
        explanation_data = generate_shap_explanation(features)
    except Exception as e:
        print(f"SHAP explanation generation failed safely: {e}")
        explanation_data = {
            "method": "SHAP",
            "status": "unavailable",
            "summary": "Explanation is currently unavailable for this prediction.",
            "factors": []
        }

    # Persist or update RiskPrediction for this specific attempt
    risk_obj, _ = RiskPrediction.objects.update_or_create(
        attempt=attempt,
        defaults={
            "student": attempt.student,
            "skill": attempt.quiz.skill,
            "risk_category": risk_category,
            "risk_probability": risk_prob,
            "confidence_score": round(risk_prob * 100, 1),
            "threshold": res.get("threshold", 0.50),
            "model_version": res.get("model_version", "junyi_academic_engagement_gb_v1"),
            "contributing_factors": features,
            "explanation_factors": explanation_data,
            "shap_base_value": explanation_data.get("base_value"),
            "explanation_method": explanation_data.get("method", "SHAP"),
            "explainer_version": explanation_data.get("explainer_version", ""),
            "is_flagged": risk_category == "High Risk",
            "flag_reason": "Automated ML prediction on finalized attempt" if risk_category == "High Risk" else "",
        }
    )

    return {
        "risk_level": risk_category,
        "risk_probability": round(risk_prob * 100, 1),
        "threshold": res.get("threshold", 0.50),
        "model_version": res.get("model_version", "junyi_academic_engagement_gb_v1"),
        "prediction_id": risk_obj.id,
        "explanation": explanation_data,
    }

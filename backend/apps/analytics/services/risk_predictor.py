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
    Predicts the student risk using the loaded Junyi Gradient Boosting model.
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
        
        # High Risk class probability (assuming class 1 is High Risk)
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

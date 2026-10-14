import joblib
import pandas as pd


# =====================================
# Model paths
# =====================================

MODEL_PATH = "ml/models/weighted_xgboost_risk_model.pkl"

ENCODER_PATH = "ml/models/weighted_risk_label_encoder.pkl"

FEATURE_PATH = "ml/models/weighted_xgboost_risk_features.pkl"


# =====================================
# Load trained model
# =====================================

print("Loading model...")

model = joblib.load(MODEL_PATH)

encoder = joblib.load(ENCODER_PATH)

features = joblib.load(FEATURE_PATH)

print("Model loaded")


# =====================================
# Risk Prediction Function
# =====================================

def predict_risk(student_features):

    # Convert input dictionary to dataframe
    df = pd.DataFrame([student_features])


    # Arrange columns exactly like training
    df = df[features]


    # Predict class
    prediction = model.predict(df)


    # Convert number back to label
    risk = encoder.inverse_transform(prediction)


    # Get probabilities
    probability = model.predict_proba(df)[0]


    return {
        "risk": risk[0],

        "probability": {
            label: round(prob * 100, 2)
            for label, prob in zip(
                encoder.classes_,
                probability
            )
        }
    }


# =====================================
# Test Prediction
# =====================================

if __name__ == "__main__":


    sample_student = {

        "past_accuracy": 0.45,

        "early_accuracy": 0.40,

        "recent_accuracy": 0.50,

        "improvement_rate": 0.10,


        "past_avg_time": 120,

        "past_median_time": 100,

        "past_max_time": 300,

        "past_min_time": 20,


        "past_avg_attempts": 2,

        "past_total_attempts": 25,

        "past_max_attempts": 5,


        "past_avg_hints": 1,

        "past_total_hints": 10,

        "past_hint_rate": 0.5,


        "past_avg_level": 1.5,

        "past_max_level": 3,

        "past_min_level": 0

    }


    result = predict_risk(sample_student)


    print("====================")
    print("Prediction Result")
    print("====================")

    print(result)
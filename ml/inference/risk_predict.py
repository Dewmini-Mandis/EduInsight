import joblib
import pandas as pd


MODEL_PATH = "ml/models/weighted_xgboost_risk_model.pkl"
ENCODER_PATH = "ml/models/weighted_risk_label_encoder.pkl"
FEATURE_PATH = "ml/models/weighted_xgboost_risk_features.pkl"


print("Loading model...")

model = joblib.load(MODEL_PATH)
encoder = joblib.load(ENCODER_PATH)
features = joblib.load(FEATURE_PATH)

print("Model loaded")


# Example student features
student = {

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


df = pd.DataFrame([student])


# same order as training
df = df[features]


prediction = model.predict(df)


risk = encoder.inverse_transform(prediction)


print("====================")
print("Student Risk")
print("====================")

print("Risk Level:", risk[0])


# probabilities
prob = model.predict_proba(df)[0]


print("\nProbability:")

for label, value in zip(
    encoder.classes_,
    prob
):
    print(
        label,
        ":",
        round(value*100,2),
        "%"
    )
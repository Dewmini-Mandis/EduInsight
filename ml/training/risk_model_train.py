import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

# -----------------------------
# Load training data
# -----------------------------

DATA_PATH = (
    "ml/data_pipeline/risk_training_data_full.csv"
)

print("Loading training data...")

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)

# -----------------------------
# Feature columns
# -----------------------------

FEATURES = [
    "past_accuracy",
    "early_accuracy",
    "recent_accuracy",
    "improvement_rate",

    "past_avg_time",
    "past_median_time",
    "past_max_time",
    "past_min_time",

    "past_avg_attempts",
    "past_total_attempts",
    "past_max_attempts",

    "past_avg_hints",
    "past_total_hints",
    "past_hint_rate",

    "past_avg_level",
    "past_max_level",
    "past_min_level"
]

X = df[FEATURES]

y = df["risk_level"]

print("\nFeatures:")
for feature in FEATURES:
    print("-", feature)

print("\nTarget distribution:")
print(y.value_counts())

# -----------------------------
# Train/test split
# -----------------------------

X_train, X_test, y_train, y_test = (
    train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )
)

print(
    "\nTraining rows:",
    len(X_train)
)

print(
    "Testing rows:",
    len(X_test)
)

# -----------------------------
# Create Random Forest
# -----------------------------

model = RandomForestClassifier(
    n_estimators=500,
    max_depth=None,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)

# -----------------------------
# Train
# -----------------------------

print("\nTraining model...")

model.fit(
    X_train,
    y_train
)

print("Training complete.")

# -----------------------------
# Predict
# -----------------------------

y_pred = model.predict(X_test)

# -----------------------------
# Accuracy
# -----------------------------

accuracy = accuracy_score(
    y_test,
    y_pred
)

print("\n==============================")
print("MODEL RESULTS")
print("==============================")

print("\nAccuracy:")
print(
    round(accuracy, 4)
)

# -----------------------------
# Classification report
# -----------------------------

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        labels=[
            "High",
            "Medium",
            "Low"
        ],
        zero_division=0
    )
)

# -----------------------------
# Confusion matrix
# -----------------------------

print("\nConfusion Matrix:")

cm = confusion_matrix(
    y_test,
    y_pred,
    labels=[
        "High",
        "Medium",
        "Low"
    ]
)

print(cm)

# -----------------------------
# Feature importance
# -----------------------------

feature_importance = pd.DataFrame({
    "feature": FEATURES,
    "importance":
        model.feature_importances_
})

feature_importance = (
    feature_importance
    .sort_values(
        "importance",
        ascending=False
    )
)

print("\nFeature Importance:")

print(
    feature_importance.to_string(
        index=False
    )
)

# -----------------------------
# Save model
# -----------------------------

MODEL_PATH = (
    "ml/models/risk_model.pkl"
)

joblib.dump(
    model,
    MODEL_PATH
)

# -----------------------------
# Save feature list
# -----------------------------

FEATURE_PATH = (
    "ml/models/risk_model_features.pkl"
)

joblib.dump(
    FEATURES,
    FEATURE_PATH
)

print("\nModel saved to:")
print(MODEL_PATH)

print("\nFeature list saved to:")
print(FEATURE_PATH)
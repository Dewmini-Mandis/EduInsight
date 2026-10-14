import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

from xgboost import XGBClassifier


# --------------------------------------------------
# 1. Load training dataset
# --------------------------------------------------

DATA_PATH = "ml/data_pipeline/risk_training_data_full.csv"

print("Loading training data...")

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)


# --------------------------------------------------
# 2. Features
# --------------------------------------------------

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

y_text = df["risk_level"]

print("\nFeatures:")

for feature in FEATURES:
    print("-", feature)

print("\nRisk distribution:")
print(y_text.value_counts())


# --------------------------------------------------
# 3. Encode labels
# --------------------------------------------------

encoder = LabelEncoder()

y = encoder.fit_transform(y_text)

print("\nClasses:")

for class_name, class_number in zip(
    encoder.classes_,
    encoder.transform(encoder.classes_)
):
    print(
        class_name,
        "->",
        class_number
    )


# --------------------------------------------------
# 4. Train/test split
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining rows:", len(X_train))
print("Testing rows:", len(X_test))


# --------------------------------------------------
# 5. XGBoost model
# --------------------------------------------------

model = XGBClassifier(
    n_estimators=500,
    max_depth=4,
    learning_rate=0.05,

    subsample=0.8,
    colsample_bytree=0.8,

    objective="multi:softprob",
    eval_metric="mlogloss",

    random_state=42,
    n_jobs=-1
)


# --------------------------------------------------
# 6. Train
# --------------------------------------------------

print("\nTraining XGBoost...")

model.fit(
    X_train,
    y_train
)

print("Training complete.")


# --------------------------------------------------
# 7. Predict
# --------------------------------------------------

y_pred = model.predict(X_test)


# --------------------------------------------------
# 8. Accuracy
# --------------------------------------------------

accuracy = accuracy_score(
    y_test,
    y_pred
)

print("\n==============================")
print("XGBOOST RESULTS")
print("==============================")

print("\nAccuracy:")
print(round(accuracy, 4))


# --------------------------------------------------
# 9. Classification report
# --------------------------------------------------

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=encoder.classes_,
        zero_division=0
    )
)


# --------------------------------------------------
# 10. Confusion matrix
# --------------------------------------------------

print("\nConfusion Matrix:")

print(
    confusion_matrix(
        y_test,
        y_pred
    )
)


# --------------------------------------------------
# 11. Feature importance
# --------------------------------------------------

importance_df = pd.DataFrame({
    "feature": FEATURES,
    "importance": model.feature_importances_
})

importance_df = importance_df.sort_values(
    "importance",
    ascending=False
)

print("\nFeature Importance:")

print(
    importance_df.to_string(
        index=False
    )
)


# --------------------------------------------------
# 12. Save model
# --------------------------------------------------

MODEL_PATH = "ml/models/xgboost_risk_model.pkl"

ENCODER_PATH = "ml/models/risk_label_encoder.pkl"

FEATURE_PATH = "ml/models/xgboost_risk_features.pkl"


joblib.dump(
    model,
    MODEL_PATH
)

joblib.dump(
    encoder,
    ENCODER_PATH
)

joblib.dump(
    FEATURES,
    FEATURE_PATH
)


print("\nXGBoost model saved to:")
print(MODEL_PATH)

print("\nLabel encoder saved to:")
print(ENCODER_PATH)

print("\nFeature list saved to:")
print(FEATURE_PATH)
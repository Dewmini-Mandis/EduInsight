import os
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    classification_report,
    confusion_matrix
)
from sklearn.utils.class_weight import compute_class_weight

from xgboost import XGBClassifier


# ==========================================================
# Paths
# ==========================================================

DATA_PATH = "ml/data_pipeline/combined_risk_training.csv"

MODEL_DIR = "ml/models"

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "combined_weighted_xgboost_risk_model.pkl"
)

ENCODER_PATH = os.path.join(
    MODEL_DIR,
    "combined_risk_label_encoder.pkl"
)

FEATURE_PATH = os.path.join(
    MODEL_DIR,
    "combined_risk_features.pkl"
)

os.makedirs(MODEL_DIR, exist_ok=True)


# ==========================================================
# Load dataset
# ==========================================================

print("Loading combined dataset...")

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)


# ==========================================================
# Common features only
# ==========================================================

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
    "past_hint_rate"
]

X = df[FEATURES].copy()
y_text = df["risk_level"].copy()


print("\nTarget distribution:")
print(y_text.value_counts())


# ==========================================================
# Encode labels
# ==========================================================

encoder = LabelEncoder()

y = encoder.fit_transform(y_text)

print("\nClasses:")

for class_name, class_number in zip(
    encoder.classes_,
    encoder.transform(encoder.classes_)
):
    print(class_name, "->", class_number)


# ==========================================================
# Train/test split
# ==========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining rows:", len(X_train))
print("Testing rows:", len(X_test))


# ==========================================================
# Balanced class weights
# ==========================================================

classes = np.unique(y_train)

class_weights = compute_class_weight(
    class_weight="balanced",
    classes=classes,
    y=y_train
)

class_weight_dict = dict(
    zip(
        classes,
        class_weights
    )
)

print("\nClass weights:")

for class_number, weight in class_weight_dict.items():

    class_name = encoder.inverse_transform(
        [class_number]
    )[0]

    print(
        f"{class_name}: {weight:.4f}"
    )


sample_weights = np.array([
    class_weight_dict[label]
    for label in y_train
])


# ==========================================================
# Model
# ==========================================================

model = XGBClassifier(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.04,

    min_child_weight=3,

    subsample=0.85,
    colsample_bytree=0.85,

    reg_alpha=0.1,
    reg_lambda=1.0,

    objective="multi:softprob",
    eval_metric="mlogloss",

    tree_method="hist",

    random_state=42,
    n_jobs=-1
)


# ==========================================================
# Train
# ==========================================================

print("\nTraining Combined Weighted XGBoost...")

model.fit(
    X_train,
    y_train,
    sample_weight=sample_weights
)

print("Training complete.")


# ==========================================================
# Predict
# ==========================================================

y_pred = model.predict(X_test)


# ==========================================================
# Metrics
# ==========================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

balanced_accuracy = balanced_accuracy_score(
    y_test,
    y_pred
)

macro_f1 = f1_score(
    y_test,
    y_pred,
    average="macro"
)

weighted_f1 = f1_score(
    y_test,
    y_pred,
    average="weighted"
)


print("\n======================================")
print("COMBINED MODEL RESULTS")
print("======================================")

print("\nAccuracy:")
print(round(accuracy, 4))

print("\nBalanced Accuracy:")
print(round(balanced_accuracy, 4))

print("\nMacro F1:")
print(round(macro_f1, 4))

print("\nWeighted F1:")
print(round(weighted_f1, 4))


print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=encoder.classes_,
        digits=4,
        zero_division=0
    )
)


print("\nConfusion Matrix:")

print(
    confusion_matrix(
        y_test,
        y_pred
    )
)


# ==========================================================
# Feature importance
# ==========================================================

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


# ==========================================================
# Save
# ==========================================================

joblib.dump(
    model,
    MODEL_PATH,
    compress=3
)

joblib.dump(
    encoder,
    ENCODER_PATH,
    compress=3
)

joblib.dump(
    FEATURES,
    FEATURE_PATH,
    compress=3
)


print("\nModel saved to:")
print(MODEL_PATH)

print("\nEncoder saved to:")
print(ENCODER_PATH)

print("\nFeatures saved to:")
print(FEATURE_PATH)

print("\nDONE.")
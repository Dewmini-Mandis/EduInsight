import os
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    balanced_accuracy_score
)
from sklearn.utils.class_weight import compute_class_weight

from xgboost import XGBClassifier


# ==========================================================
# 1. Paths
# ==========================================================

DATA_PATH = "ml/data_pipeline/risk_training_data_full.csv"

MODEL_DIR = "ml/models"
MODEL_PATH = os.path.join(
    MODEL_DIR,
    "weighted_xgboost_risk_model.pkl"
)

ENCODER_PATH = os.path.join(
    MODEL_DIR,
    "weighted_risk_label_encoder.pkl"
)

FEATURE_PATH = os.path.join(
    MODEL_DIR,
    "weighted_xgboost_risk_features.pkl"
)

os.makedirs(MODEL_DIR, exist_ok=True)


# ==========================================================
# 2. Load dataset
# ==========================================================

print("Loading full training dataset...")

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)


# ==========================================================
# 3. Features
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
    "past_hint_rate",

    "past_avg_level",
    "past_max_level",
    "past_min_level"
]

X = df[FEATURES].copy()

y_text = df["risk_level"].copy()


print("\nFeatures:")

for feature in FEATURES:
    print("-", feature)


print("\nTarget distribution:")
print(y_text.value_counts())


# ==========================================================
# 4. Check missing values
# ==========================================================

print("\nMissing feature values:")
print(X.isnull().sum())

# Replace inf values
X = X.replace(
    [np.inf, -np.inf],
    np.nan
)

# Fill missing values with median
X = X.fillna(
    X.median()
)


# ==========================================================
# 5. Encode target
# ==========================================================

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


# ==========================================================
# 6. Train / Test Split
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
# 7. Calculate class weights
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


print("\nCalculated class weights:")

for class_number, weight in class_weight_dict.items():

    class_name = encoder.inverse_transform(
        [class_number]
    )[0]

    print(
        f"{class_name}: {weight:.4f}"
    )


# ==========================================================
# 8. Create sample weights
# ==========================================================

sample_weights = np.array([
    class_weight_dict[label]
    for label in y_train
])

print("\nSample weights created.")

print(
    "Minimum weight:",
    round(sample_weights.min(), 4)
)

print(
    "Maximum weight:",
    round(sample_weights.max(), 4)
)


# ==========================================================
# 9. Weighted XGBoost
# ==========================================================

model = XGBClassifier(

    n_estimators=400,

    max_depth=5,

    learning_rate=0.05,

    min_child_weight=3,

    subsample=0.8,

    colsample_bytree=0.8,

    reg_alpha=0.1,

    reg_lambda=1.0,

    objective="multi:softprob",

    eval_metric="mlogloss",

    random_state=42,

    n_jobs=-1,

    tree_method="hist"
)


# ==========================================================
# 10. Train
# ==========================================================

print("\nTraining Weighted XGBoost...")

model.fit(
    X_train,
    y_train,
    sample_weight=sample_weights
)

print("Training complete.")


# ==========================================================
# 11. Predictions
# ==========================================================

y_pred = model.predict(
    X_test
)


# ==========================================================
# 12. Evaluation
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
print("WEIGHTED XGBOOST RESULTS")
print("======================================")


print("\nAccuracy:")
print(
    round(
        accuracy,
        4
    )
)


print("\nBalanced Accuracy:")
print(
    round(
        balanced_accuracy,
        4
    )
)


print("\nMacro F1:")
print(
    round(
        macro_f1,
        4
    )
)


print("\nWeighted F1:")
print(
    round(
        weighted_f1,
        4
    )
)


# ==========================================================
# 13. Classification Report
# ==========================================================

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


# ==========================================================
# 14. Confusion Matrix
# ==========================================================

print("\nConfusion Matrix:")

cm = confusion_matrix(
    y_test,
    y_pred
)

print(cm)


# ==========================================================
# 15. Feature Importance
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
# 16. Save model
# ==========================================================

print("\nSaving model...")

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


print("\nWeighted XGBoost model saved to:")
print(MODEL_PATH)

print("\nLabel encoder saved to:")
print(ENCODER_PATH)

print("\nFeature list saved to:")
print(FEATURE_PATH)

print("\nDONE.")
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

from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier


# ==========================================================
# PATHS
# ==========================================================

DATA_PATH = "ml/data_pipeline/risk_training_data_full.csv"

MODEL_DIR = "ml/models"

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "smote_xgboost_risk_model.pkl"
)

ENCODER_PATH = os.path.join(
    MODEL_DIR,
    "smote_risk_label_encoder.pkl"
)

FEATURE_PATH = os.path.join(
    MODEL_DIR,
    "smote_xgboost_risk_features.pkl"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


# ==========================================================
# LOAD DATA
# ==========================================================

print("Loading Junyi full training dataset...")

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)


# ==========================================================
# FEATURES
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


print("\nFeatures:")

for feature in FEATURES:
    print("-", feature)


X = df[FEATURES].copy()

y_text = df["risk_level"].copy()


# ==========================================================
# ORIGINAL DISTRIBUTION
# ==========================================================

print("\nOriginal risk distribution:")

print(
    y_text.value_counts()
)


# ==========================================================
# LABEL ENCODING
# ==========================================================

encoder = LabelEncoder()

y = encoder.fit_transform(
    y_text
)


print("\nClasses:")

for name, number in zip(
    encoder.classes_,
    encoder.transform(encoder.classes_)
):

    print(
        name,
        "->",
        number
    )


# ==========================================================
# TRAIN / TEST SPLIT
# ==========================================================

# IMPORTANT:
# Split BEFORE SMOTE.
#
# Test set must remain real data.

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print("\nBefore SMOTE:")

print(
    "Training rows:",
    len(X_train)
)

print(
    "Testing rows:",
    len(X_test)
)


print("\nTraining class distribution BEFORE SMOTE:")

unique, counts = np.unique(
    y_train,
    return_counts=True
)

for class_number, count in zip(
    unique,
    counts
):

    class_name = encoder.inverse_transform(
        [class_number]
    )[0]

    print(
        f"{class_name}: {count}"
    )


# ==========================================================
# SMOTE
# ==========================================================

print("\nApplying SMOTE to TRAINING DATA ONLY...")

smote = SMOTE(
    random_state=42,
    k_neighbors=5
)

X_train_smote, y_train_smote = smote.fit_resample(
    X_train,
    y_train
)


print("\nAfter SMOTE:")

print(
    "Training rows:",
    len(X_train_smote)
)


print("\nTraining class distribution AFTER SMOTE:")

unique, counts = np.unique(
    y_train_smote,
    return_counts=True
)

for class_number, count in zip(
    unique,
    counts
):

    class_name = encoder.inverse_transform(
        [class_number]
    )[0]

    print(
        f"{class_name}: {count}"
    )


# ==========================================================
# XGBOOST
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
# TRAIN
# ==========================================================

print(
    "\nTraining SMOTE + XGBoost..."
)

model.fit(
    X_train_smote,
    y_train_smote
)

print(
    "Training complete."
)


# ==========================================================
# PREDICT REAL TEST DATA
# ==========================================================

print(
    "\nPredicting REAL test data..."
)

y_pred = model.predict(
    X_test
)


# ==========================================================
# METRICS
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
print("SMOTE + XGBOOST RESULTS")
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
# FEATURE IMPORTANCE
# ==========================================================

importance_df = pd.DataFrame({

    "feature": FEATURES,

    "importance":
        model.feature_importances_
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
# SAVE MODEL
# ==========================================================

print(
    "\nSaving model..."
)


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


print(
    "\nModel saved to:"
)

print(
    MODEL_PATH
)


print(
    "\nEncoder saved to:"
)

print(
    ENCODER_PATH
)


print(
    "\nFeature list saved to:"
)

print(
    FEATURE_PATH
)


print(
    "\nDONE."
)
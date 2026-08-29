import os
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)

from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier
)

from sklearn.utils.class_weight import compute_class_weight


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = (
    "ml/data_pipeline/assistments_risk_training_v3.csv"
)

REPORT_PATH = (
    "ml/binary_threshold_tuning_report_v3.csv"
)

MODEL_DIR = "ml/models"

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


# ============================================================
# FEATURES
# ============================================================

FEATURES = [
    "past_accuracy",
    "early_accuracy",
    "recent_accuracy",
    "recent3_accuracy",
    "improvement_rate",
    "accuracy_trend",

    "correct_streak",
    "wrong_streak",

    "past_avg_time",
    "past_median_time",
    "recent_avg_time",
    "response_time_trend",

    "past_avg_attempts",
    "recent_avg_attempts",
    "attempt_trend",
]


GROUP_COLUMN = "user_id"


# ============================================================
# THRESHOLDS TO TEST
# ============================================================

THRESHOLDS = np.arange(
    0.30,
    0.71,
    0.02
)


# ============================================================
# LOAD DATA
# ============================================================

print("==========================================")
print("ASSISTMENTS V3 BINARY THRESHOLD TUNING")
print("==========================================")

print("\nLoading dataset...")

df = pd.read_csv(
    DATA_PATH
)


print(
    "Dataset shape:",
    df.shape
)

print(
    "Unique students:",
    df[
        GROUP_COLUMN
    ].nunique()
)


# ============================================================
# CREATE BINARY TARGET
# ============================================================

df["binary_risk"] = np.where(
    df["future_accuracy"] < 0.50,
    1,
    0
)


print(
    "\nBinary distribution:"
)

print(
    df[
        "binary_risk"
    ].value_counts()
)


# ============================================================
# PREPARE DATA
# ============================================================

X = df[
    FEATURES
].copy()

y = df[
    "binary_risk"
].astype(int).values

groups = df[
    GROUP_COLUMN
]


# ============================================================
# STUDENT-WISE TRAIN / TEST SPLIT
# ============================================================

splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42
)


train_index, test_index = next(
    splitter.split(
        X,
        y,
        groups=groups
    )
)


X_train = X.iloc[
    train_index
].copy()

X_test = X.iloc[
    test_index
].copy()

y_train = y[
    train_index
]

y_test = y[
    test_index
]


train_students = set(
    groups.iloc[
        train_index
    ].unique()
)

test_students = set(
    groups.iloc[
        test_index
    ].unique()
)


print(
    "\nTraining samples:",
    len(X_train)
)

print(
    "Testing samples:",
    len(X_test)
)

print(
    "Student overlap:",
    len(
        train_students.intersection(
            test_students
        )
    )
)


# ============================================================
# CLASS WEIGHTS
# ============================================================

classes = np.unique(
    y_train
)


weights = compute_class_weight(
    class_weight="balanced",
    classes=classes,
    y=y_train
)


class_weight_dict = dict(
    zip(
        classes,
        weights
    )
)


sample_weights = np.array([
    class_weight_dict[
        label
    ]
    for label in y_train
])


print(
    "\nClass weights:"
)

print(
    class_weight_dict
)


# ============================================================
# MODELS
# ============================================================

models = {

    "Random Forest": RandomForestClassifier(
        n_estimators=500,
        max_depth=14,
        min_samples_split=5,
        min_samples_leaf=2,

        class_weight="balanced",

        random_state=42,
        n_jobs=-1
    ),

    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=250,
        learning_rate=0.05,
        max_depth=3,
        random_state=42
    ),
}


# ============================================================
# RESULTS
# ============================================================

all_results = []

best_model_name = None
best_threshold = None
best_high_risk_f1 = -1
best_model_object = None


# ============================================================
# TRAIN MODELS
# ============================================================

for model_name, model in models.items():

    print(
        "\n=========================================="
    )

    print(
        "TRAINING:",
        model_name
    )

    print(
        "=========================================="
    )


    # --------------------------------------------------------
    # FIT
    # --------------------------------------------------------

    if model_name == "Gradient Boosting":

        model.fit(
            X_train,
            y_train,
            sample_weight=sample_weights
        )

    else:

        model.fit(
            X_train,
            y_train
        )


    # --------------------------------------------------------
    # PREDICT HIGH-RISK PROBABILITY
    # --------------------------------------------------------

    probabilities = model.predict_proba(
        X_test
    )[:, 1]


    print(
        "\nTesting thresholds..."
    )


    # ========================================================
    # THRESHOLD LOOP
    # ========================================================

    for threshold in THRESHOLDS:

        y_pred = (
            probabilities >= threshold
        ).astype(int)


        accuracy = accuracy_score(
            y_test,
            y_pred
        )


        balanced_accuracy = (
            balanced_accuracy_score(
                y_test,
                y_pred
            )
        )


        precision = precision_score(
            y_test,
            y_pred,
            pos_label=1,
            zero_division=0
        )


        recall = recall_score(
            y_test,
            y_pred,
            pos_label=1,
            zero_division=0
        )


        high_risk_f1 = f1_score(
            y_test,
            y_pred,
            pos_label=1,
            zero_division=0
        )


        macro_f1 = f1_score(
            y_test,
            y_pred,
            average="macro",
            zero_division=0
        )


        matrix = confusion_matrix(
            y_test,
            y_pred,
            labels=[
                0,
                1
            ]
        )


        tn, fp, fn, tp = (
            matrix.ravel()
        )


        specificity = (
            tn / (tn + fp)
            if (tn + fp) > 0
            else 0
        )


        false_negative_rate = (
            fn / (fn + tp)
            if (fn + tp) > 0
            else 0
        )


        all_results.append({

            "Model":
                model_name,

            "Threshold":
                round(
                    float(
                        threshold
                    ),
                    2
                ),

            "Accuracy":
                accuracy,

            "Balanced Accuracy":
                balanced_accuracy,

            "High Risk Precision":
                precision,

            "High Risk Recall":
                recall,

            "High Risk F1":
                high_risk_f1,

            "Macro F1":
                macro_f1,

            "Specificity":
                specificity,

            "False Negative Rate":
                false_negative_rate,

            "TN":
                int(tn),

            "FP":
                int(fp),

            "FN":
                int(fn),

            "TP":
                int(tp),
        })


        # ----------------------------------------------------
        # SELECT BEST THRESHOLD
        #
        # Main objective:
        # maximize High Risk F1
        # ----------------------------------------------------

        if high_risk_f1 > best_high_risk_f1:

            best_high_risk_f1 = (
                high_risk_f1
            )

            best_threshold = (
                float(
                    threshold
                )
            )

            best_model_name = (
                model_name
            )

            best_model_object = (
                model
            )


# ============================================================
# CREATE REPORT
# ============================================================

results_df = pd.DataFrame(
    all_results
)


results_df = results_df.sort_values(
    by=[
        "High Risk F1",
        "Balanced Accuracy"
    ],
    ascending=[
        False,
        False
    ]
).reset_index(
    drop=True
)


# ============================================================
# PRINT BEST OVERALL
# ============================================================

print(
    "\n=========================================="
)

print(
    "BEST OVERALL THRESHOLD"
)

print(
    "=========================================="
)


print(
    "Model:",
    best_model_name
)

print(
    "Threshold:",
    round(
        best_threshold,
        2
    )
)

print(
    "High Risk F1:",
    round(
        best_high_risk_f1,
        4
    )
)


# ============================================================
# PRINT TOP 20
# ============================================================

print(
    "\n=========================================="
)

print(
    "TOP 20 THRESHOLD RESULTS"
)

print(
    "=========================================="
)


top_columns = [
    "Model",
    "Threshold",
    "Accuracy",
    "Balanced Accuracy",
    "High Risk Precision",
    "High Risk Recall",
    "High Risk F1",
    "Macro F1",
    "Specificity",
    "False Negative Rate"
]


print(
    results_df[
        top_columns
    ]
    .head(20)
    .to_string(
        index=False
    )
)


# ============================================================
# PERCENTAGE REPORT
# ============================================================

percentage_report = (
    results_df.copy()
)


percentage_columns = [
    "Accuracy",
    "Balanced Accuracy",
    "High Risk Precision",
    "High Risk Recall",
    "High Risk F1",
    "Macro F1",
    "Specificity",
    "False Negative Rate",
]


for column in percentage_columns:

    percentage_report[
        column
    ] = (
        percentage_report[
            column
        ]
        * 100
    ).round(
        2
    )


# ============================================================
# SAVE REPORT
# ============================================================

percentage_report.to_csv(
    REPORT_PATH,
    index=False
)


print(
    "\nThreshold report saved to:"
)

print(
    REPORT_PATH
)


# ============================================================
# GET BEST RESULT ROW
# ============================================================

best_row = (
    percentage_report
    .iloc[0]
)


print(
    "\n=========================================="
)

print(
    "BEST RESULT DETAILS"
)

print(
    "=========================================="
)


print(
    best_row[
        top_columns
    ].to_string()
)


# ============================================================
# SAVE BEST MODEL
# ============================================================

BEST_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_binary_threshold_tuned_model.pkl"
)


THRESHOLD_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_binary_best_threshold.pkl"
)


FEATURE_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_binary_threshold_features.pkl"
)


joblib.dump(
    best_model_object,
    BEST_MODEL_PATH,
    compress=3
)


joblib.dump(
    best_threshold,
    THRESHOLD_PATH,
    compress=3
)


joblib.dump(
    FEATURES,
    FEATURE_PATH,
    compress=3
)


print(
    "\nBest threshold-tuned model saved to:"
)

print(
    BEST_MODEL_PATH
)


print(
    "\nBest threshold saved to:"
)

print(
    THRESHOLD_PATH
)


print(
    "\nFeatures saved to:"
)

print(
    FEATURE_PATH
)


print(
    "\n=========================================="
)

print(
    "DONE"
)

print(
    "=========================================="
)
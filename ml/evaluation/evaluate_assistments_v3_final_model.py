import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
    roc_curve
)

from sklearn.model_selection import GroupShuffleSplit


# ============================================================
# PATHS
# ============================================================

DATA_PATH = (
    "ml/data_pipeline/assistments_risk_training_v3.csv"
)

MODEL_PATH = (
    "ml/models/assistments_v3_final_gradient_boosting_risk_model.pkl"
)

THRESHOLD_PATH = (
    "ml/models/assistments_v3_final_threshold.pkl"
)

FEATURE_PATH = (
    "ml/models/assistments_v3_final_features.pkl"
)

SPLIT_PATH = (
    "ml/models/assistments_v3_final_student_split.pkl"
)

REPORT_DIR = "ml/reports/final_evaluation"

os.makedirs(
    REPORT_DIR,
    exist_ok=True
)


# ============================================================
# OUTPUT PATHS
# ============================================================

METRICS_PATH = os.path.join(
    REPORT_DIR,
    "final_metrics.csv"
)

CLASSIFICATION_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "classification_report.csv"
)

CONFUSION_MATRIX_PATH = os.path.join(
    REPORT_DIR,
    "confusion_matrix.csv"
)

FEATURE_IMPORTANCE_PATH = os.path.join(
    REPORT_DIR,
    "feature_importance.csv"
)

ROC_DATA_PATH = os.path.join(
    REPORT_DIR,
    "roc_curve_data.csv"
)

ROC_PLOT_PATH = os.path.join(
    REPORT_DIR,
    "roc_curve.png"
)

FEATURE_IMPORTANCE_PLOT_PATH = os.path.join(
    REPORT_DIR,
    "feature_importance.png"
)

CONFUSION_MATRIX_PLOT_PATH = os.path.join(
    REPORT_DIR,
    "confusion_matrix.png"
)

PREDICTIONS_PATH = os.path.join(
    REPORT_DIR,
    "test_predictions.csv"
)


# ============================================================
# LOAD MODEL FILES
# ============================================================

print("==========================================")
print("FINAL MODEL EVALUATION")
print("==========================================")

print("\nLoading model...")

model = joblib.load(
    MODEL_PATH
)

threshold = joblib.load(
    THRESHOLD_PATH
)

features = joblib.load(
    FEATURE_PATH
)

split_info = joblib.load(
    SPLIT_PATH
)


print(
    "Threshold:",
    threshold
)

print(
    "Number of features:",
    len(features)
)


# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv(
    DATA_PATH
)

print(
    "\nDataset shape:",
    df.shape
)


# ============================================================
# CREATE BINARY TARGET
# ============================================================

df["binary_target"] = np.where(
    df["future_accuracy"] < 0.50,
    1,
    0
)


# ============================================================
# GET FINAL TEST STUDENTS
# ============================================================

test_students = set(
    split_info[
        "test_students"
    ]
)


test_df = df[
    df["user_id"].isin(
        test_students
    )
].copy()


print(
    "Test rows:",
    len(test_df)
)

print(
    "Test students:",
    test_df["user_id"].nunique()
)


# ============================================================
# PREPARE TEST DATA
# ============================================================

X_test = test_df[
    features
].copy()

y_test = test_df[
    "binary_target"
].values


# ============================================================
# PREDICTIONS
# ============================================================

probabilities = model.predict_proba(
    X_test
)[:, 1]


predictions = (
    probabilities >= threshold
).astype(int)


# ============================================================
# METRICS
# ============================================================

accuracy = accuracy_score(
    y_test,
    predictions
)

balanced_accuracy = balanced_accuracy_score(
    y_test,
    predictions
)

precision = precision_score(
    y_test,
    predictions,
    pos_label=1,
    zero_division=0
)

recall = recall_score(
    y_test,
    predictions,
    pos_label=1,
    zero_division=0
)

high_risk_f1 = f1_score(
    y_test,
    predictions,
    pos_label=1,
    zero_division=0
)

macro_f1 = f1_score(
    y_test,
    predictions,
    average="macro",
    zero_division=0
)

weighted_f1 = f1_score(
    y_test,
    predictions,
    average="weighted",
    zero_division=0
)

roc_auc = roc_auc_score(
    y_test,
    probabilities
)


matrix = confusion_matrix(
    y_test,
    predictions,
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


# ============================================================
# PRINT FINAL METRICS
# ============================================================

print(
    "\n=========================================="
)

print(
    "FINAL METRICS"
)

print(
    "=========================================="
)


metrics = {
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

    "Weighted F1":
        weighted_f1,

    "Specificity":
        specificity,

    "False Negative Rate":
        false_negative_rate,

    "ROC-AUC":
        roc_auc,
}


for key, value in metrics.items():

    print(
        f"{key}: "
        f"{value * 100:.2f}%"
    )


# ============================================================
# SAVE METRICS
# ============================================================

metrics_df = pd.DataFrame([
    {
        "Metric":
            key,

        "Value":
            value,

        "Percentage":
            round(
                value * 100,
                2
            )
    }

    for key, value
    in metrics.items()
])


metrics_df.to_csv(
    METRICS_PATH,
    index=False
)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

report_dict = classification_report(
    y_test,
    predictions,
    target_names=[
        "Not High Risk",
        "High Risk"
    ],
    output_dict=True,
    zero_division=0
)


classification_df = (
    pd.DataFrame(
        report_dict
    )
    .transpose()
)


classification_df.to_csv(
    CLASSIFICATION_REPORT_PATH
)


print(
    "\nClassification Report:"
)

print(
    classification_df.round(
        4
    )
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

confusion_df = pd.DataFrame(
    matrix,
    index=[
        "Actual Not High Risk",
        "Actual High Risk"
    ],
    columns=[
        "Predicted Not High Risk",
        "Predicted High Risk"
    ]
)


confusion_df.to_csv(
    CONFUSION_MATRIX_PATH
)


print(
    "\nConfusion Matrix:"
)

print(
    confusion_df
)


# ============================================================
# CONFUSION MATRIX PLOT
# ============================================================

plt.figure(
    figsize=(
        6,
        5
    )
)

plt.imshow(
    matrix
)

plt.title(
    "Confusion Matrix - Final Risk Model"
)

plt.xticks(
    [
        0,
        1
    ],
    [
        "Not High Risk",
        "High Risk"
    ]
)

plt.yticks(
    [
        0,
        1
    ],
    [
        "Not High Risk",
        "High Risk"
    ]
)


for i in range(
    matrix.shape[0]
):

    for j in range(
        matrix.shape[1]
    ):

        plt.text(
            j,
            i,
            str(
                matrix[i, j]
            ),
            ha="center",
            va="center"
        )


plt.xlabel(
    "Predicted Label"
)

plt.ylabel(
    "Actual Label"
)

plt.tight_layout()

plt.savefig(
    CONFUSION_MATRIX_PLOT_PATH,
    dpi=300
)

plt.close()


# ============================================================
# ROC CURVE
# ============================================================

fpr, tpr, roc_thresholds = roc_curve(
    y_test,
    probabilities
)


roc_df = pd.DataFrame({
    "False Positive Rate":
        fpr,

    "True Positive Rate":
        tpr,

    "Threshold":
        roc_thresholds
})


roc_df.to_csv(
    ROC_DATA_PATH,
    index=False
)


plt.figure(
    figsize=(
        7,
        6
    )
)


plt.plot(
    fpr,
    tpr,
    label=(
        f"Gradient Boosting "
        f"(AUC = {roc_auc:.3f})"
    )
)


plt.plot(
    [
        0,
        1
    ],
    [
        0,
        1
    ],
    linestyle="--"
)


plt.xlabel(
    "False Positive Rate"
)

plt.ylabel(
    "True Positive Rate"
)

plt.title(
    "ROC Curve - Student High-Risk Prediction"
)

plt.legend()

plt.tight_layout()

plt.savefig(
    ROC_PLOT_PATH,
    dpi=300
)

plt.close()


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

if hasattr(
    model,
    "feature_importances_"
):

    feature_importance_df = pd.DataFrame({

        "Feature":
            features,

        "Importance":
            model.feature_importances_
    })


    feature_importance_df = (
        feature_importance_df
        .sort_values(
            by="Importance",
            ascending=False
        )
        .reset_index(
            drop=True
        )
    )


    feature_importance_df.to_csv(
        FEATURE_IMPORTANCE_PATH,
        index=False
    )


    print(
        "\n=========================================="
    )

    print(
        "FEATURE IMPORTANCE"
    )

    print(
        "=========================================="
    )


    print(
        feature_importance_df.to_string(
            index=False
        )
    )


    # --------------------------------------------------------
    # Plot top features
    # --------------------------------------------------------

    top_features = (
        feature_importance_df
        .head(15)
        .sort_values(
            by="Importance",
            ascending=True
        )
    )


    plt.figure(
        figsize=(
            9,
            7
        )
    )


    plt.barh(
        top_features[
            "Feature"
        ],
        top_features[
            "Importance"
        ]
    )


    plt.xlabel(
        "Feature Importance"
    )

    plt.ylabel(
        "Feature"
    )

    plt.title(
        "Top Feature Importance - Final Risk Model"
    )

    plt.tight_layout()

    plt.savefig(
        FEATURE_IMPORTANCE_PLOT_PATH,
        dpi=300
    )

    plt.close()


# ============================================================
# SAVE TEST PREDICTIONS
# ============================================================

prediction_df = test_df[
    [
        "user_id",
        "skill_id",
        "future_accuracy"
    ]
].copy()


prediction_df[
    "actual_label"
] = y_test


prediction_df[
    "predicted_label"
] = predictions


prediction_df[
    "high_risk_probability"
] = probabilities


prediction_df[
    "actual_risk"
] = np.where(
    prediction_df[
        "actual_label"
    ] == 1,
    "High Risk",
    "Not High Risk"
)


prediction_df[
    "predicted_risk"
] = np.where(
    prediction_df[
        "predicted_label"
    ] == 1,
    "High Risk",
    "Not High Risk"
)


prediction_df.to_csv(
    PREDICTIONS_PATH,
    index=False
)


# ============================================================
# HIGH-RISK SUMMARY
# ============================================================

actual_high = (
    tp + fn
)

detected_high = (
    tp
)

missed_high = (
    fn
)


print(
    "\n=========================================="
)

print(
    "HIGH-RISK DETECTION SUMMARY"
)

print(
    "=========================================="
)


print(
    "Actual High-Risk cases:",
    actual_high
)

print(
    "Correctly detected High-Risk:",
    detected_high
)

print(
    "Missed High-Risk:",
    missed_high
)

print(
    "Detection rate:",
    f"{recall * 100:.2f}%"
)


# ============================================================
# FINAL OUTPUT SUMMARY
# ============================================================

print(
    "\n=========================================="
)

print(
    "EVALUATION FILES CREATED"
)

print(
    "=========================================="
)


print(
    "\nMetrics:"
)

print(
    METRICS_PATH
)


print(
    "\nClassification report:"
)

print(
    CLASSIFICATION_REPORT_PATH
)


print(
    "\nConfusion matrix:"
)

print(
    CONFUSION_MATRIX_PATH
)


print(
    "\nROC data:"
)

print(
    ROC_DATA_PATH
)


print(
    "\nROC plot:"
)

print(
    ROC_PLOT_PATH
)


print(
    "\nFeature importance:"
)

print(
    FEATURE_IMPORTANCE_PATH
)


print(
    "\nFeature importance plot:"
)

print(
    FEATURE_IMPORTANCE_PLOT_PATH
)


print(
    "\nConfusion matrix plot:"
)

print(
    CONFUSION_MATRIX_PLOT_PATH
)


print(
    "\nTest predictions:"
)

print(
    PREDICTIONS_PATH
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
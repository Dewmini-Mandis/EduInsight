import os
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import GroupShuffleSplit, ParameterGrid
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)
from sklearn.utils.class_weight import compute_class_weight


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = (
    "ml/data_pipeline/assistments_risk_training_v3.csv"
)

MODEL_DIR = "ml/models"

REPORT_DIR = "ml/reports"

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

os.makedirs(
    REPORT_DIR,
    exist_ok=True
)


# ============================================================
# OUTPUT FILES
# ============================================================

HYPERPARAM_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "assistments_v3_gradient_boosting_hyperparameter_results.csv"
)

THRESHOLD_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "assistments_v3_gradient_boosting_threshold_results.csv"
)

FINAL_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "assistments_v3_final_test_results.csv"
)

BEST_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_final_gradient_boosting_risk_model.pkl"
)

BEST_THRESHOLD_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_final_threshold.pkl"
)

FEATURE_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_final_features.pkl"
)

SPLIT_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_final_student_split.pkl"
)

CONFIG_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_final_config.pkl"
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
# TARGET DEFINITION
# ============================================================
#
# 1 = High Risk
# 0 = Not High Risk
#
# High Risk:
# future_accuracy < 0.50
#
# Not High Risk:
# future_accuracy >= 0.50
# ============================================================

HIGH_RISK_THRESHOLD = 0.50


# ============================================================
# RANDOM SEED
# ============================================================

RANDOM_STATE = 42


# ============================================================
# HYPERPARAMETER GRID
# ============================================================
#
# Keep this moderate so training does not become too expensive.
# ============================================================

PARAM_GRID = {
    "n_estimators": [
        150,
        250,
        350,
    ],

    "learning_rate": [
        0.03,
        0.05,
        0.08,
    ],

    "max_depth": [
        2,
        3,
        4,
    ],

    "min_samples_split": [
        5,
        10,
    ],

    "min_samples_leaf": [
        2,
        5,
    ],

    "subsample": [
        0.8,
        1.0,
    ],
}


# ============================================================
# THRESHOLDS TO TEST
# ============================================================

THRESHOLDS = np.arange(
    0.30,
    0.71,
    0.02
)


# ============================================================
# HELPER FUNCTION
# ============================================================

def calculate_metrics(
    y_true,
    y_pred,
    probabilities
):

    accuracy = accuracy_score(
        y_true,
        y_pred
    )

    balanced_accuracy = balanced_accuracy_score(
        y_true,
        y_pred
    )

    precision = precision_score(
        y_true,
        y_pred,
        pos_label=1,
        zero_division=0
    )

    recall = recall_score(
        y_true,
        y_pred,
        pos_label=1,
        zero_division=0
    )

    high_risk_f1 = f1_score(
        y_true,
        y_pred,
        pos_label=1,
        zero_division=0
    )

    macro_f1 = f1_score(
        y_true,
        y_pred,
        average="macro",
        zero_division=0
    )

    weighted_f1 = f1_score(
        y_true,
        y_pred,
        average="weighted",
        zero_division=0
    )

    roc_auc = roc_auc_score(
        y_true,
        probabilities
    )


    matrix = confusion_matrix(
        y_true,
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


    return {
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

        "TN":
            int(tn),

        "FP":
            int(fp),

        "FN":
            int(fn),

        "TP":
            int(tp),
    }


# ============================================================
# LOAD DATA
# ============================================================

print("==========================================")
print("ASSISTMENTS V3 FINAL MODEL TUNING")
print("==========================================")

print("\nLoading V3 dataset...")


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
# VALIDATE COLUMNS
# ============================================================

required_columns = (
    FEATURES
    + [
        GROUP_COLUMN,
        "future_accuracy"
    ]
)


missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]


if missing_columns:

    raise ValueError(
        "Missing columns: "
        + str(missing_columns)
    )


# ============================================================
# CLEAN INVALID VALUES
# ============================================================

df = df.replace(
    [
        np.inf,
        -np.inf
    ],
    np.nan
)


before_cleaning = len(
    df
)


df = df.dropna(
    subset=required_columns
).copy()


after_cleaning = len(
    df
)


print(
    "Rows removed due to NaN/Inf:",
    before_cleaning
    - after_cleaning
)


# ============================================================
# CREATE BINARY TARGET
# ============================================================

df["binary_target"] = np.where(
    df["future_accuracy"]
    < HIGH_RISK_THRESHOLD,
    1,
    0
)


print(
    "\nBinary target distribution:"
)


print(
    df[
        "binary_target"
    ]
    .value_counts()
    .sort_index()
)


print(
    "\nBinary target percentages:"
)


print(
    (
        df[
            "binary_target"
        ]
        .value_counts(
            normalize=True
        )
        .sort_index()
        * 100
    ).round(2)
)


# ============================================================
# PREPARE DATA
# ============================================================

X = df[
    FEATURES
].copy()


y = df[
    "binary_target"
].values


groups = df[
    GROUP_COLUMN
].copy()


# ============================================================
# SPLIT 1
#
# Full dataset:
# 80% development
# 20% final test
# ============================================================

print(
    "\n=========================================="
)

print(
    "CREATING FINAL TEST SPLIT"
)

print(
    "=========================================="
)


outer_splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=RANDOM_STATE
)


development_index, test_index = next(
    outer_splitter.split(
        X,
        y,
        groups=groups
    )
)


X_development = X.iloc[
    development_index
].copy()


X_test = X.iloc[
    test_index
].copy()


y_development = y[
    development_index
]


y_test = y[
    test_index
]


development_groups = groups.iloc[
    development_index
]


test_groups = groups.iloc[
    test_index
]


# ============================================================
# SPLIT 2
#
# Development dataset:
# 80% train
# 20% validation
#
# Overall approximately:
# Train      = 64%
# Validation = 16%
# Test       = 20%
# ============================================================

inner_splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=RANDOM_STATE
)


train_relative_index, validation_relative_index = next(
    inner_splitter.split(
        X_development,
        y_development,
        groups=development_groups
    )
)


X_train = X_development.iloc[
    train_relative_index
].copy()


X_validation = X_development.iloc[
    validation_relative_index
].copy()


y_train = y_development[
    train_relative_index
]


y_validation = y_development[
    validation_relative_index
]


train_groups = development_groups.iloc[
    train_relative_index
]


validation_groups = development_groups.iloc[
    validation_relative_index
]


# ============================================================
# SPLIT SUMMARY
# ============================================================

print(
    "\nTraining samples:",
    len(X_train)
)

print(
    "Validation samples:",
    len(X_validation)
)

print(
    "Test samples:",
    len(X_test)
)


print(
    "\nTraining students:",
    train_groups.nunique()
)

print(
    "Validation students:",
    validation_groups.nunique()
)

print(
    "Test students:",
    test_groups.nunique()
)


# ============================================================
# LEAKAGE CHECK
# ============================================================

train_students = set(
    train_groups.unique()
)

validation_students = set(
    validation_groups.unique()
)

test_students = set(
    test_groups.unique()
)


train_validation_overlap = (
    train_students.intersection(
        validation_students
    )
)

train_test_overlap = (
    train_students.intersection(
        test_students
    )
)

validation_test_overlap = (
    validation_students.intersection(
        test_students
    )
)


print(
    "\nTrain/Validation student overlap:",
    len(train_validation_overlap)
)

print(
    "Train/Test student overlap:",
    len(train_test_overlap)
)

print(
    "Validation/Test student overlap:",
    len(validation_test_overlap)
)


if (
    train_validation_overlap
    or train_test_overlap
    or validation_test_overlap
):

    raise ValueError(
        "Student leakage detected."
    )


# ============================================================
# CLASS DISTRIBUTION
# ============================================================

print(
    "\nTraining class distribution:"
)

print(
    pd.Series(
        y_train
    )
    .value_counts()
    .sort_index()
)


print(
    "\nValidation class distribution:"
)

print(
    pd.Series(
        y_validation
    )
    .value_counts()
    .sort_index()
)


print(
    "\nTest class distribution:"
)

print(
    pd.Series(
        y_test
    )
    .value_counts()
    .sort_index()
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


sample_weights_train = np.array([
    class_weight_dict[
        label
    ]
    for label in y_train
])


print(
    "\n=========================================="
)

print(
    "TRAINING CLASS WEIGHTS"
)

print(
    "=========================================="
)


for class_number, weight in class_weight_dict.items():

    class_name = (
        "High Risk"
        if class_number == 1
        else "Not High Risk"
    )

    print(
        f"{class_name}: {weight:.4f}"
    )


# ============================================================
# HYPERPARAMETER SEARCH
# ============================================================

print(
    "\n=========================================="
)

print(
    "HYPERPARAMETER SEARCH"
)

print(
    "=========================================="
)


parameter_combinations = list(
    ParameterGrid(
        PARAM_GRID
    )
)


print(
    "Total parameter combinations:",
    len(
        parameter_combinations
    )
)


hyperparameter_results = []


best_parameters = None
best_validation_auc = -1
best_validation_f1_at_050 = -1


for experiment_number, parameters in enumerate(
    parameter_combinations,
    start=1
):


    print(
        f"\nExperiment "
        f"{experiment_number}/"
        f"{len(parameter_combinations)}"
    )


    print(
        parameters
    )


    model = GradientBoostingClassifier(
        random_state=RANDOM_STATE,
        **parameters
    )


    model.fit(
        X_train,
        y_train,
        sample_weight=sample_weights_train
    )


    validation_probabilities = (
        model.predict_proba(
            X_validation
        )[:, 1]
    )


    validation_predictions = (
        validation_probabilities
        >= 0.50
    ).astype(int)


    metrics = calculate_metrics(
        y_validation,
        validation_predictions,
        validation_probabilities
    )


    hyperparameter_results.append({

        **parameters,

        **metrics
    })


    print(
        "Validation ROC-AUC:",
        round(
            metrics[
                "ROC-AUC"
            ],
            4
        )
    )


    print(
        "Validation High Risk F1 @0.50:",
        round(
            metrics[
                "High Risk F1"
            ],
            4
        )
    )


    # --------------------------------------------------------
    # Select hyperparameters primarily using ROC-AUC
    #
    # ROC-AUC is threshold-independent.
    #
    # If ROC-AUC ties, use High Risk F1 at threshold 0.50.
    # --------------------------------------------------------

    current_auc = metrics[
        "ROC-AUC"
    ]

    current_f1 = metrics[
        "High Risk F1"
    ]


    if (
        current_auc > best_validation_auc
        or
        (
            np.isclose(
                current_auc,
                best_validation_auc
            )
            and
            current_f1
            > best_validation_f1_at_050
        )
    ):

        best_validation_auc = (
            current_auc
        )

        best_validation_f1_at_050 = (
            current_f1
        )

        best_parameters = (
            parameters.copy()
        )


# ============================================================
# SAVE HYPERPARAMETER REPORT
# ============================================================

hyperparameter_df = pd.DataFrame(
    hyperparameter_results
)


hyperparameter_df = (
    hyperparameter_df
    .sort_values(
        by=[
            "ROC-AUC",
            "High Risk F1"
        ],
        ascending=[
            False,
            False
        ]
    )
    .reset_index(
        drop=True
    )
)


hyperparameter_df.to_csv(
    HYPERPARAM_REPORT_PATH,
    index=False
)


print(
    "\n=========================================="
)

print(
    "BEST HYPERPARAMETERS"
)

print(
    "=========================================="
)


print(
    best_parameters
)


print(
    "Best Validation ROC-AUC:",
    round(
        best_validation_auc,
        4
    )
)


print(
    "High Risk F1 @0.50:",
    round(
        best_validation_f1_at_050,
        4
    )
)


print(
    "\nHyperparameter report saved to:"
)

print(
    HYPERPARAM_REPORT_PATH
)


# ============================================================
# TRAIN BEST MODEL ON TRAIN SET
#
# Still do NOT use test set.
# ============================================================

best_validation_model = GradientBoostingClassifier(
    random_state=RANDOM_STATE,
    **best_parameters
)


best_validation_model.fit(
    X_train,
    y_train,
    sample_weight=sample_weights_train
)


validation_probabilities = (
    best_validation_model.predict_proba(
        X_validation
    )[:, 1]
)


# ============================================================
# THRESHOLD TUNING ON VALIDATION SET ONLY
# ============================================================

print(
    "\n=========================================="
)

print(
    "VALIDATION THRESHOLD TUNING"
)

print(
    "=========================================="
)


threshold_results = []


best_threshold = None
best_threshold_f1 = -1
best_threshold_balanced_accuracy = -1


for threshold in THRESHOLDS:


    validation_predictions = (
        validation_probabilities
        >= threshold
    ).astype(int)


    metrics = calculate_metrics(
        y_validation,
        validation_predictions,
        validation_probabilities
    )


    threshold_results.append({

        "Threshold":
            round(
                float(
                    threshold
                ),
                2
            ),

        **metrics
    })


    # --------------------------------------------------------
    # Select threshold primarily using High Risk F1.
    #
    # Tie-breaker:
    # Balanced Accuracy.
    # --------------------------------------------------------

    current_f1 = metrics[
        "High Risk F1"
    ]

    current_balanced_accuracy = metrics[
        "Balanced Accuracy"
    ]


    if (
        current_f1 > best_threshold_f1
        or
        (
            np.isclose(
                current_f1,
                best_threshold_f1
            )
            and
            current_balanced_accuracy
            > best_threshold_balanced_accuracy
        )
    ):

        best_threshold_f1 = (
            current_f1
        )

        best_threshold_balanced_accuracy = (
            current_balanced_accuracy
        )

        best_threshold = (
            float(
                threshold
            )
        )


# ============================================================
# SAVE THRESHOLD REPORT
# ============================================================

threshold_df = pd.DataFrame(
    threshold_results
)


threshold_df = (
    threshold_df
    .sort_values(
        by=[
            "High Risk F1",
            "Balanced Accuracy"
        ],
        ascending=[
            False,
            False
        ]
    )
    .reset_index(
        drop=True
    )
)


threshold_df.to_csv(
    THRESHOLD_REPORT_PATH,
    index=False
)


print(
    "\nBest validation threshold:",
    round(
        best_threshold,
        2
    )
)


print(
    "Best Validation High Risk F1:",
    round(
        best_threshold_f1,
        4
    )
)


print(
    "Validation Balanced Accuracy:",
    round(
        best_threshold_balanced_accuracy,
        4
    )
)


print(
    "\nThreshold report saved to:"
)

print(
    THRESHOLD_REPORT_PATH
)


print(
    "\nTop 10 threshold results:"
)


print(
    threshold_df[
        [
            "Threshold",
            "Accuracy",
            "Balanced Accuracy",
            "High Risk Precision",
            "High Risk Recall",
            "High Risk F1",
            "Macro F1",
            "Specificity",
            "ROC-AUC",
        ]
    ]
    .head(10)
    .to_string(
        index=False
    )
)


# ============================================================
# FINAL TRAINING
#
# Combine TRAIN + VALIDATION after model/threshold selection.
#
# TEST SET REMAINS UNTOUCHED.
# ============================================================

print(
    "\n=========================================="
)

print(
    "FINAL MODEL TRAINING"
)

print(
    "=========================================="
)


X_final_train = pd.concat(
    [
        X_train,
        X_validation
    ],
    axis=0
)


y_final_train = np.concatenate(
    [
        y_train,
        y_validation
    ]
)


# ============================================================
# RECOMPUTE CLASS WEIGHTS
# ============================================================

final_classes = np.unique(
    y_final_train
)


final_weights = compute_class_weight(
    class_weight="balanced",
    classes=final_classes,
    y=y_final_train
)


final_class_weight_dict = dict(
    zip(
        final_classes,
        final_weights
    )
)


final_sample_weights = np.array([
    final_class_weight_dict[
        label
    ]
    for label in y_final_train
])


print(
    "\nFinal training samples:",
    len(
        X_final_train
    )
)


print(
    "Final test samples:",
    len(
        X_test
    )
)


# ============================================================
# FIT FINAL MODEL
# ============================================================

final_model = GradientBoostingClassifier(
    random_state=RANDOM_STATE,
    **best_parameters
)


final_model.fit(
    X_final_train,
    y_final_train,
    sample_weight=final_sample_weights
)


# ============================================================
# FINAL TEST EVALUATION
#
# This is the first time the test set is used for metrics.
# ============================================================

print(
    "\n=========================================="
)

print(
    "FINAL UNTOUCHED TEST EVALUATION"
)

print(
    "=========================================="
)


test_probabilities = (
    final_model.predict_proba(
        X_test
    )[:, 1]
)


test_predictions = (
    test_probabilities
    >= best_threshold
).astype(int)


final_metrics = calculate_metrics(
    y_test,
    test_predictions,
    test_probabilities
)


print(
    "\nBest parameters:"
)

print(
    best_parameters
)


print(
    "\nBest threshold:",
    round(
        best_threshold,
        2
    )
)


print(
    "\nFINAL TEST RESULTS"
)


for key in [
    "Accuracy",
    "Balanced Accuracy",
    "High Risk Precision",
    "High Risk Recall",
    "High Risk F1",
    "Macro F1",
    "Weighted F1",
    "Specificity",
    "False Negative Rate",
    "ROC-AUC",
]:

    print(
        f"{key}:",
        round(
            final_metrics[
                key
            ],
            4
        )
    )


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print(
    "\nClassification Report:"
)


print(
    classification_report(
        y_test,
        test_predictions,
        target_names=[
            "Not High Risk",
            "High Risk"
        ],
        digits=4,
        zero_division=0
    )
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

final_matrix = confusion_matrix(
    y_test,
    test_predictions,
    labels=[
        0,
        1
    ]
)


print(
    "\nConfusion Matrix:"
)

print(
    final_matrix
)


print(
    "\nFormat:"
)

print(
    "[[TN FP]"
)

print(
    " [FN TP]]"
)


# ============================================================
# CREATE FINAL REPORT
# ============================================================

final_report = pd.DataFrame([
    {
        "Model":
            "Gradient Boosting",

        "Threshold":
            best_threshold,

        **best_parameters,

        **final_metrics
    }
])


percentage_columns = [
    "Accuracy",
    "Balanced Accuracy",
    "High Risk Precision",
    "High Risk Recall",
    "High Risk F1",
    "Macro F1",
    "Weighted F1",
    "Specificity",
    "False Negative Rate",
    "ROC-AUC",
]


percentage_report = (
    final_report.copy()
)


for column in percentage_columns:

    percentage_report[
        column
    ] = (
        percentage_report[
            column
        ]
        * 100
    ).round(2)


percentage_report.to_csv(
    FINAL_REPORT_PATH,
    index=False
)


print(
    "\n=========================================="
)

print(
    "FINAL PERCENTAGE RESULTS"
)

print(
    "=========================================="
)


print(
    percentage_report.to_string(
        index=False
    )
)


print(
    "\nFinal report saved to:"
)

print(
    FINAL_REPORT_PATH
)


# ============================================================
# SAVE FINAL MODEL
# ============================================================

joblib.dump(
    final_model,
    BEST_MODEL_PATH,
    compress=3
)


joblib.dump(
    best_threshold,
    BEST_THRESHOLD_PATH,
    compress=3
)


joblib.dump(
    FEATURES,
    FEATURE_PATH,
    compress=3
)


# ============================================================
# SAVE SPLIT INFORMATION
# ============================================================

split_info = {
    "train_students":
        sorted(
            list(
                train_students
            )
        ),

    "validation_students":
        sorted(
            list(
                validation_students
            )
        ),

    "test_students":
        sorted(
            list(
                test_students
            )
        ),

    "random_state":
        RANDOM_STATE,

    "overall_test_size":
        0.20,

    "development_validation_size":
        0.20,
}


joblib.dump(
    split_info,
    SPLIT_PATH,
    compress=3
)


# ============================================================
# SAVE FINAL CONFIGURATION
# ============================================================

final_config = {
    "model":
        "GradientBoostingClassifier",

    "parameters":
        best_parameters,

    "prediction_threshold":
        best_threshold,

    "risk_definition":
        (
            "High Risk if future_accuracy < 0.50; "
            "otherwise Not High Risk"
        ),

    "target_mapping":
        {
            0:
                "Not High Risk",

            1:
                "High Risk",
        },

    "past_window":
        10,

    "future_window":
        10,

    "step_size":
        5,

    "feature_count":
        len(
            FEATURES
        ),
}


joblib.dump(
    final_config,
    CONFIG_PATH,
    compress=3
)


print(
    "\n=========================================="
)

print(
    "FINAL FILES SAVED"
)

print(
    "=========================================="
)


print(
    "\nModel:"
)

print(
    BEST_MODEL_PATH
)


print(
    "\nThreshold:"
)

print(
    BEST_THRESHOLD_PATH
)


print(
    "\nFeatures:"
)

print(
    FEATURE_PATH
)


print(
    "\nStudent split:"
)

print(
    SPLIT_PATH
)


print(
    "\nConfiguration:"
)

print(
    CONFIG_PATH
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
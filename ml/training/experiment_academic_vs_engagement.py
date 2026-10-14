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
    confusion_matrix
)
from sklearn.utils.class_weight import compute_class_weight


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = (
    "ml/data_pipeline/assistments_risk_training_v3.csv"
)

REPORT_DIR = "ml/reports/academic_vs_engagement"

MODEL_DIR = "ml/models"

os.makedirs(
    REPORT_DIR,
    exist_ok=True
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


RANDOM_STATE = 42

HIGH_RISK_THRESHOLD = 0.50


# ============================================================
# FEATURE SET 1
# ACADEMIC ONLY
# ============================================================

ACADEMIC_FEATURES = [

    "past_accuracy",
    "early_accuracy",
    "recent_accuracy",
    "recent3_accuracy",
    "improvement_rate",
    "accuracy_trend",

    "correct_streak",
    "wrong_streak",
]


# ============================================================
# FEATURE SET 2
# ACADEMIC + ENGAGEMENT
# ============================================================

ACADEMIC_ENGAGEMENT_FEATURES = [

    # Academic
    "past_accuracy",
    "early_accuracy",
    "recent_accuracy",
    "recent3_accuracy",
    "improvement_rate",
    "accuracy_trend",

    "correct_streak",
    "wrong_streak",

    # Response-time engagement
    "past_avg_time",
    "past_median_time",
    "recent_avg_time",
    "response_time_trend",

    # Attempt engagement
    "past_avg_attempts",
    "recent_avg_attempts",
    "attempt_trend",
]


FEATURE_SETS = {

    "Academic Only":
        ACADEMIC_FEATURES,

    "Academic + Engagement":
        ACADEMIC_ENGAGEMENT_FEATURES,
}


# ============================================================
# HYPERPARAMETER GRID
# ============================================================
#
# Smaller than final 216-search experiment,
# but both feature sets receive exactly the same search.
# ============================================================

PARAM_GRID = {

    "n_estimators": [
        250,
        350
    ],

    "learning_rate": [
        0.03,
        0.05
    ],

    "max_depth": [
        3,
        4
    ],

    "min_samples_leaf": [
        2,
        5
    ],

    "min_samples_split": [
        5
    ],

    "subsample": [
        0.8,
        1.0
    ],
}


# ============================================================
# THRESHOLDS
# ============================================================

THRESHOLDS = np.arange(
    0.40,
    0.71,
    0.02
)


# ============================================================
# METRIC FUNCTION
# ============================================================

def calculate_metrics(
    y_true,
    probabilities,
    threshold
):

    predictions = (
        probabilities >= threshold
    ).astype(int)


    accuracy = accuracy_score(
        y_true,
        predictions
    )


    balanced_accuracy = (
        balanced_accuracy_score(
            y_true,
            predictions
        )
    )


    precision = precision_score(
        y_true,
        predictions,
        pos_label=1,
        zero_division=0
    )


    recall = recall_score(
        y_true,
        predictions,
        pos_label=1,
        zero_division=0
    )


    high_risk_f1 = f1_score(
        y_true,
        predictions,
        pos_label=1,
        zero_division=0
    )


    macro_f1 = f1_score(
        y_true,
        predictions,
        average="macro",
        zero_division=0
    )


    weighted_f1 = f1_score(
        y_true,
        predictions,
        average="weighted",
        zero_division=0
    )


    roc_auc = roc_auc_score(
        y_true,
        probabilities
    )


    matrix = confusion_matrix(
        y_true,
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

print(
    "=========================================="
)

print(
    "ACADEMIC-ONLY VS ACADEMIC + ENGAGEMENT"
)

print(
    "=========================================="
)


df = pd.read_csv(
    DATA_PATH
)


print(
    "\nDataset shape:",
    df.shape
)


print(
    "Unique students:",
    df["user_id"].nunique()
)


# ============================================================
# TARGET
# ============================================================

df["binary_target"] = np.where(

    df["future_accuracy"]
    < HIGH_RISK_THRESHOLD,

    1,

    0
)


print(
    "\nTarget distribution:"
)


print(
    df[
        "binary_target"
    ]
    .value_counts()
    .sort_index()
)


# ============================================================
# STUDENT-WISE SPLITS
# ============================================================
#
# IMPORTANT:
# Create indices ONCE.
#
# Both feature-set experiments use exactly
# the same students.
# ============================================================

groups = df[
    "user_id"
].copy()


y = df[
    "binary_target"
].values


outer_splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=RANDOM_STATE
)


development_index, test_index = next(

    outer_splitter.split(
        df,
        y,
        groups=groups
    )
)


development_df = df.iloc[
    development_index
].copy()


test_df = df.iloc[
    test_index
].copy()


inner_splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=RANDOM_STATE
)


train_relative_index, validation_relative_index = next(

    inner_splitter.split(

        development_df,

        development_df[
            "binary_target"
        ].values,

        groups=development_df[
            "user_id"
        ]
    )
)


train_df = development_df.iloc[
    train_relative_index
].copy()


validation_df = development_df.iloc[
    validation_relative_index
].copy()


# ============================================================
# LEAKAGE CHECK
# ============================================================

train_students = set(
    train_df[
        "user_id"
    ].unique()
)


validation_students = set(
    validation_df[
        "user_id"
    ].unique()
)


test_students = set(
    test_df[
        "user_id"
    ].unique()
)


print(
    "\nTrain students:",
    len(train_students)
)

print(
    "Validation students:",
    len(validation_students)
)

print(
    "Test students:",
    len(test_students)
)


print(
    "\nTrain/Validation overlap:",
    len(
        train_students
        .intersection(
            validation_students
        )
    )
)


print(
    "Train/Test overlap:",
    len(
        train_students
        .intersection(
            test_students
        )
    )
)


print(
    "Validation/Test overlap:",
    len(
        validation_students
        .intersection(
            test_students
        )
    )
)


# ============================================================
# CLASS WEIGHTS
# ============================================================

y_train_common = train_df[
    "binary_target"
].values


classes = np.unique(
    y_train_common
)


class_weights = compute_class_weight(

    class_weight="balanced",

    classes=classes,

    y=y_train_common
)


class_weight_dict = dict(
    zip(
        classes,
        class_weights
    )
)


sample_weights = np.array([

    class_weight_dict[
        label
    ]

    for label in y_train_common
])


print(
    "\nClass weights:",
    class_weight_dict
)


# ============================================================
# EXPERIMENT STORAGE
# ============================================================

final_results = []

hyperparameter_results = []

threshold_results = []


# ============================================================
# FEATURE-SET EXPERIMENT LOOP
# ============================================================

for experiment_name, features in FEATURE_SETS.items():


    print(
        "\n\n=========================================="
    )

    print(
        "EXPERIMENT:",
        experiment_name
    )

    print(
        "=========================================="
    )


    print(
        "Feature count:",
        len(features)
    )


    print(
        "Features:"
    )


    for feature in features:

        print(
            "-",
            feature
        )


    # ========================================================
    # DATA
    # ========================================================

    X_train = train_df[
        features
    ].copy()


    X_validation = validation_df[
        features
    ].copy()


    X_test = test_df[
        features
    ].copy()


    y_train = train_df[
        "binary_target"
    ].values


    y_validation = validation_df[
        "binary_target"
    ].values


    y_test = test_df[
        "binary_target"
    ].values


    # ========================================================
    # HYPERPARAMETER SEARCH
    # ========================================================

    best_params = None

    best_validation_auc = -1

    best_validation_f1 = -1


    parameter_list = list(
        ParameterGrid(
            PARAM_GRID
        )
    )


    print(
        "\nHyperparameter combinations:",
        len(
            parameter_list
        )
    )


    for number, params in enumerate(
        parameter_list,
        start=1
    ):


        model = GradientBoostingClassifier(
            random_state=RANDOM_STATE,
            **params
        )


        model.fit(
            X_train,
            y_train,
            sample_weight=sample_weights
        )


        probabilities = (
            model.predict_proba(
                X_validation
            )[:, 1]
        )


        metrics = calculate_metrics(
            y_validation,
            probabilities,
            0.50
        )


        hyperparameter_results.append({

            "Experiment":
                experiment_name,

            **params,

            **metrics,
        })


        print(
            f"{number}/"
            f"{len(parameter_list)}"
            " | AUC:",
            round(
                metrics[
                    "ROC-AUC"
                ],
                4
            ),
            "| F1:",
            round(
                metrics[
                    "High Risk F1"
                ],
                4
            )
        )


        if (
            metrics[
                "ROC-AUC"
            ]
            > best_validation_auc
            or
            (
                np.isclose(
                    metrics[
                        "ROC-AUC"
                    ],
                    best_validation_auc
                )
                and
                metrics[
                    "High Risk F1"
                ]
                > best_validation_f1
            )
        ):

            best_validation_auc = (
                metrics[
                    "ROC-AUC"
                ]
            )

            best_validation_f1 = (
                metrics[
                    "High Risk F1"
                ]
            )

            best_params = (
                params.copy()
            )


    print(
        "\nBest hyperparameters:"
    )

    print(
        best_params
    )


    print(
        "Best validation AUC:",
        round(
            best_validation_auc,
            4
        )
    )


    # ========================================================
    # TRAIN BEST MODEL
    # ========================================================

    best_model = GradientBoostingClassifier(
        random_state=RANDOM_STATE,
        **best_params
    )


    best_model.fit(
        X_train,
        y_train,
        sample_weight=sample_weights
    )


    validation_probabilities = (
        best_model.predict_proba(
            X_validation
        )[:, 1]
    )


    # ========================================================
    # THRESHOLD TUNING
    # ========================================================

    best_threshold = None

    best_threshold_f1 = -1

    best_threshold_balanced_accuracy = -1


    for threshold in THRESHOLDS:


        metrics = calculate_metrics(
            y_validation,
            validation_probabilities,
            threshold
        )


        threshold_results.append({

            "Experiment":
                experiment_name,

            "Threshold":
                round(
                    float(
                        threshold
                    ),
                    2
                ),

            **metrics,
        })


        if (
            metrics[
                "High Risk F1"
            ]
            > best_threshold_f1
            or
            (
                np.isclose(
                    metrics[
                        "High Risk F1"
                    ],
                    best_threshold_f1
                )
                and
                metrics[
                    "Balanced Accuracy"
                ]
                > best_threshold_balanced_accuracy
            )
        ):

            best_threshold_f1 = (
                metrics[
                    "High Risk F1"
                ]
            )

            best_threshold_balanced_accuracy = (
                metrics[
                    "Balanced Accuracy"
                ]
            )

            best_threshold = (
                float(
                    threshold
                )
            )


    print(
        "\nBest threshold:",
        round(
            best_threshold,
            2
        )
    )


    print(
        "Validation High Risk F1:",
        round(
            best_threshold_f1,
            4
        )
    )


    # ========================================================
    # FINAL TRAINING
    # TRAIN + VALIDATION
    # ========================================================

    final_train_df = pd.concat(
        [
            train_df,
            validation_df
        ],
        ignore_index=True
    )


    X_final_train = final_train_df[
        features
    ].copy()


    y_final_train = final_train_df[
        "binary_target"
    ].values


    final_classes = np.unique(
        y_final_train
    )


    final_class_weights = compute_class_weight(

        class_weight="balanced",

        classes=final_classes,

        y=y_final_train
    )


    final_weight_dict = dict(
        zip(
            final_classes,
            final_class_weights
        )
    )


    final_sample_weights = np.array([

        final_weight_dict[
            label
        ]

        for label in y_final_train
    ])


    final_model = GradientBoostingClassifier(
        random_state=RANDOM_STATE,
        **best_params
    )


    final_model.fit(
        X_final_train,
        y_final_train,
        sample_weight=final_sample_weights
    )


    # ========================================================
    # UNTOUCHED TEST
    # ========================================================

    test_probabilities = (
        final_model.predict_proba(
            X_test
        )[:, 1]
    )


    test_metrics = calculate_metrics(
        y_test,
        test_probabilities,
        best_threshold
    )


    # ========================================================
    # RESULTS
    # ========================================================

    result = {

        "Experiment":
            experiment_name,

        "Feature Count":
            len(features),

        "Threshold":
            best_threshold,

        **best_params,

        **test_metrics,
    }


    final_results.append(
        result
    )


    print(
        "\nFINAL TEST RESULTS"
    )


    print(
        "Accuracy:",
        round(
            test_metrics[
                "Accuracy"
            ]
            * 100,
            2
        ),
        "%"
    )


    print(
        "Balanced Accuracy:",
        round(
            test_metrics[
                "Balanced Accuracy"
            ]
            * 100,
            2
        ),
        "%"
    )


    print(
        "High Risk Recall:",
        round(
            test_metrics[
                "High Risk Recall"
            ]
            * 100,
            2
        ),
        "%"
    )


    print(
        "High Risk F1:",
        round(
            test_metrics[
                "High Risk F1"
            ]
            * 100,
            2
        ),
        "%"
    )


    print(
        "Macro F1:",
        round(
            test_metrics[
                "Macro F1"
            ]
            * 100,
            2
        ),
        "%"
    )


    print(
        "ROC-AUC:",
        round(
            test_metrics[
                "ROC-AUC"
            ]
            * 100,
            2
        ),
        "%"
    )


    # ========================================================
    # SAVE MODEL
    # ========================================================

    safe_name = (
        experiment_name
        .lower()
        .replace(
            " ",
            "_"
        )
        .replace(
            "+",
            "plus"
        )
    )


    model_path = os.path.join(
        MODEL_DIR,
        (
            "assistments_"
            f"{safe_name}_"
            "gradient_boosting.pkl"
        )
    )


    joblib.dump(
        final_model,
        model_path,
        compress=3
    )


# ============================================================
# SAVE REPORTS
# ============================================================

final_results_df = pd.DataFrame(
    final_results
)


hyperparameter_df = pd.DataFrame(
    hyperparameter_results
)


threshold_df = pd.DataFrame(
    threshold_results
)


FINAL_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "academic_vs_engagement_final_results.csv"
)


HYPERPARAMETER_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "academic_vs_engagement_hyperparameters.csv"
)


THRESHOLD_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "academic_vs_engagement_thresholds.csv"
)


final_results_df.to_csv(
    FINAL_REPORT_PATH,
    index=False
)


hyperparameter_df.to_csv(
    HYPERPARAMETER_REPORT_PATH,
    index=False
)


threshold_df.to_csv(
    THRESHOLD_REPORT_PATH,
    index=False
)


# ============================================================
# COMPUTE IMPROVEMENT
# ============================================================

academic_row = (
    final_results_df[
        final_results_df[
            "Experiment"
        ]
        == "Academic Only"
    ]
    .iloc[0]
)


engagement_row = (
    final_results_df[
        final_results_df[
            "Experiment"
        ]
        == "Academic + Engagement"
    ]
    .iloc[0]
)


comparison_metrics = [

    "Accuracy",
    "Balanced Accuracy",
    "High Risk Precision",
    "High Risk Recall",
    "High Risk F1",
    "Macro F1",
    "Weighted F1",
    "Specificity",
    "ROC-AUC",
]


comparison_rows = []


for metric in comparison_metrics:


    academic_value = (
        academic_row[
            metric
        ]
    )


    engagement_value = (
        engagement_row[
            metric
        ]
    )


    improvement = (
        engagement_value
        - academic_value
    )


    comparison_rows.append({

        "Metric":
            metric,

        "Academic Only":
            academic_value,

        "Academic + Engagement":
            engagement_value,

        "Absolute Improvement":
            improvement,

        "Improvement Percentage Points":
            improvement * 100,
    })


comparison_df = pd.DataFrame(
    comparison_rows
)


COMPARISON_PATH = os.path.join(
    REPORT_DIR,
    "academic_vs_engagement_improvement.csv"
)


comparison_df.to_csv(
    COMPARISON_PATH,
    index=False
)


# ============================================================
# PRINT FINAL COMPARISON
# ============================================================

print(
    "\n\n=========================================="
)

print(
    "ACADEMIC VS ENGAGEMENT FINAL COMPARISON"
)

print(
    "=========================================="
)


display_df = (
    final_results_df[
        [
            "Experiment",
            "Feature Count",
            "Threshold",
            "Accuracy",
            "Balanced Accuracy",
            "High Risk Precision",
            "High Risk Recall",
            "High Risk F1",
            "Macro F1",
            "Weighted F1",
            "Specificity",
            "ROC-AUC",
        ]
    ]
    .copy()
)


percentage_columns = [

    "Accuracy",
    "Balanced Accuracy",
    "High Risk Precision",
    "High Risk Recall",
    "High Risk F1",
    "Macro F1",
    "Weighted F1",
    "Specificity",
    "ROC-AUC",
]


for column in percentage_columns:

    display_df[
        column
    ] = (
        display_df[
            column
        ]
        * 100
    ).round(
        2
    )


print(
    display_df.to_string(
        index=False
    )
)


print(
    "\n=========================================="
)

print(
    "MEASURABLE ENGAGEMENT IMPROVEMENT"
)

print(
    "=========================================="
)


improvement_display = (
    comparison_df.copy()
)


for column in [
    "Academic Only",
    "Academic + Engagement"
]:

    improvement_display[
        column
    ] = (
        improvement_display[
            column
        ]
        * 100
    ).round(
        2
    )


improvement_display[
    "Improvement Percentage Points"
] = (
    improvement_display[
        "Improvement Percentage Points"
    ]
    .round(
        2
    )
)


print(
    improvement_display[
        [
            "Metric",
            "Academic Only",
            "Academic + Engagement",
            "Improvement Percentage Points"
        ]
    ]
    .to_string(
        index=False
    )
)


print(
    "\n=========================================="
)

print(
    "REPORTS SAVED"
)

print(
    "=========================================="
)


print(
    FINAL_REPORT_PATH
)

print(
    COMPARISON_PATH
)

print(
    HYPERPARAMETER_REPORT_PATH
)

print(
    THRESHOLD_REPORT_PATH
)


print(
    "\nDONE."
)
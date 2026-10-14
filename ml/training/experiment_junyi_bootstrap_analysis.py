import os
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import (
    GroupShuffleSplit,
    ParameterGrid
)

from sklearn.ensemble import (
    GradientBoostingClassifier
)

from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix
)

from sklearn.utils.class_weight import (
    compute_class_weight
)


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = (
    "ml/data_pipeline/junyi_risk_training_binary.csv"
)

REPORT_DIR = (
    "ml/reports/junyi_academic_vs_engagement"
)

MODEL_DIR = (
    "ml/models"
)

os.makedirs(
    REPORT_DIR,
    exist_ok=True
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

RANDOM_STATE = 42


# ============================================================
# FEATURE SET 1 - ACADEMIC ONLY
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
# FEATURE SET 2 - ACADEMIC + ENGAGEMENT
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

    # Engagement - response time
    "past_avg_time",
    "past_median_time",
    "recent_avg_time",
    "response_time_trend",

    # Engagement - attempts
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
# THRESHOLD SEARCH
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
        probabilities
        >= threshold
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


    high_risk_precision = precision_score(
        y_true,
        predictions,
        pos_label=1,
        zero_division=0
    )


    high_risk_recall = recall_score(
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


    pr_auc = average_precision_score(
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
            high_risk_precision,

        "High Risk Recall":
            high_risk_recall,

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

        "PR-AUC":
            pr_auc,

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
# LOAD JUNYI DATASET
# ============================================================

print("==========================================")
print("JUNYI ACADEMIC VS ENGAGEMENT EXPERIMENT")
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
        "user_id"
    ].nunique()
)


# ============================================================
# TARGET ENCODING
# ============================================================
#
# 1 = High Risk
# 0 = Not High Risk
# ============================================================

df[
    "binary_target"
] = np.where(

    df[
        "binary_risk"
    ]
    == "High Risk",

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


print(
    "\nTarget percentages:"
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
    ).round(
        2
    )
)


# ============================================================
# VALIDATE FEATURES
# ============================================================

all_required_features = list(
    set(
        ACADEMIC_FEATURES
        + ACADEMIC_ENGAGEMENT_FEATURES
    )
)


required_columns = (
    all_required_features
    + [
        "user_id",
        "binary_target"
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
        + str(
            missing_columns
        )
    )


# ============================================================
# REMOVE INVALID ROWS
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
    "\nRows removed due to NaN/Inf:",
    before_cleaning
    - after_cleaning
)


# ============================================================
# CREATE STUDENT-WISE SPLITS ONCE
#
# Same students used for both experiments
# ============================================================

groups = df[
    "user_id"
].copy()


y_all = df[
    "binary_target"
].values


# ------------------------------------------------------------
# Outer split:
# 80% development
# 20% final test
# ------------------------------------------------------------

outer_splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=RANDOM_STATE
)


development_index, test_index = next(

    outer_splitter.split(
        df,
        y_all,
        groups=groups
    )
)


development_df = df.iloc[
    development_index
].copy()


test_df = df.iloc[
    test_index
].copy()


# ------------------------------------------------------------
# Inner split:
# development -> 80% train / 20% validation
#
# Overall approx:
# Train = 64%
# Validation = 16%
# Test = 20%
# ------------------------------------------------------------

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
# SPLIT SUMMARY
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
    "\n=========================================="
)

print(
    "STUDENT-WISE SPLIT"
)

print(
    "=========================================="
)


print(
    "Training rows:",
    len(
        train_df
    )
)


print(
    "Validation rows:",
    len(
        validation_df
    )
)


print(
    "Test rows:",
    len(
        test_df
    )
)


print(
    "\nTrain students:",
    len(
        train_students
    )
)


print(
    "Validation students:",
    len(
        validation_students
    )
)


print(
    "Test students:",
    len(
        test_students
    )
)


print(
    "\nTrain/Validation overlap:",
    len(
        train_students.intersection(
            validation_students
        )
    )
)


print(
    "Train/Test overlap:",
    len(
        train_students.intersection(
            test_students
        )
    )
)


print(
    "Validation/Test overlap:",
    len(
        validation_students.intersection(
            test_students
        )
    )
)


if (
    train_students.intersection(
        validation_students
    )
    or
    train_students.intersection(
        test_students
    )
    or
    validation_students.intersection(
        test_students
    )
):

    raise ValueError(
        "Student leakage detected."
    )


# ============================================================
# TRAINING CLASS WEIGHTS
# ============================================================

y_train_common = train_df[
    "binary_target"
].values


classes = np.unique(
    y_train_common
)


weights = compute_class_weight(
    class_weight="balanced",
    classes=classes,
    y=y_train_common
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

    for label
    in y_train_common
])


print(
    "\nClass weights:"
)

print(
    class_weight_dict
)


# ============================================================
# RESULT STORAGE
# ============================================================

final_results = []

hyperparameter_results = []

threshold_results = []

test_prediction_store = {}
selected_thresholds = {}


# ============================================================
# EXPERIMENT LOOP
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
        len(
            features
        )
    )


    print(
        "\nFeatures:"
    )


    for feature in features:

        print(
            "-",
            feature
        )


    # ========================================================
    # PREPARE DATA
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


    best_params = None

    best_validation_auc = -1

    best_validation_f1 = -1


    for experiment_number, params in enumerate(
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


        validation_probabilities = (
            model.predict_proba(
                X_validation
            )[:, 1]
        )


        metrics = calculate_metrics(
            y_validation,
            validation_probabilities,
            0.50
        )


        hyperparameter_results.append({

            "Experiment":
                experiment_name,

            **params,

            **metrics,
        })


        print(
            f"{experiment_number}/"
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


        # ----------------------------------------------------
        # Select parameters primarily using ROC-AUC.
        # Tie-breaker = High Risk F1
        # ----------------------------------------------------

        current_auc = (
            metrics[
                "ROC-AUC"
            ]
        )


        current_f1 = (
            metrics[
                "High Risk F1"
            ]
        )


        if (
            current_auc
            > best_validation_auc
            or
            (
                np.isclose(
                    current_auc,
                    best_validation_auc
                )
                and
                current_f1
                > best_validation_f1
            )
        ):

            best_validation_auc = (
                current_auc
            )

            best_validation_f1 = (
                current_f1
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
        "Best validation ROC-AUC:",
        round(
            best_validation_auc,
            4
        )
    )


    # ========================================================
    # TRAIN BEST VALIDATION MODEL
    # ========================================================

    validation_model = (
        GradientBoostingClassifier(
            random_state=RANDOM_STATE,
            **best_params
        )
    )


    validation_model.fit(
        X_train,
        y_train,
        sample_weight=sample_weights
    )


    validation_probabilities = (
        validation_model.predict_proba(
            X_validation
        )[:, 1]
    )


    # ========================================================
    # THRESHOLD TUNING ON VALIDATION ONLY
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


        current_f1 = (
            metrics[
                "High Risk F1"
            ]
        )


        current_balanced_accuracy = (
            metrics[
                "Balanced Accuracy"
            ]
        )


        if (
            current_f1
            > best_threshold_f1
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


    print(
        "\nBest threshold:",
        round(
            best_threshold,
            2
        )
    )


    print(
        "Best validation High Risk F1:",
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


    # ========================================================
    # FINAL TRAINING
    # Combine Train + Validation
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


    final_weights = compute_class_weight(
        class_weight="balanced",
        classes=final_classes,
        y=y_final_train
    )


    final_weight_dict = dict(
        zip(
            final_classes,
            final_weights
        )
    )


    final_sample_weights = np.array([

        final_weight_dict[
            label
        ]

        for label
        in y_final_train
    ])


    final_model = (
        GradientBoostingClassifier(
            random_state=RANDOM_STATE,
            **best_params
        )
    )


    final_model.fit(
        X_final_train,
        y_final_train,
        sample_weight=final_sample_weights
    )


    # ========================================================
    # FINAL UNTOUCHED TEST EVALUATION
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

    test_prediction_store[experiment_name] = np.asarray(
        test_probabilities,
        dtype=float
    )
    selected_thresholds[experiment_name] = float(
        best_threshold
    )


    result = {

        "Experiment":
            experiment_name,

        "Feature Count":
            len(
                features
            ),

        "Threshold":
            best_threshold,

        **best_params,

        **test_metrics,
    }


    final_results.append(
        result
    )


    print(
        "\n=========================================="
    )

    print(
        "FINAL TEST RESULTS"
    )

    print(
        "=========================================="
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
        "High Risk Precision:",
        round(
            test_metrics[
                "High Risk Precision"
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
        "Weighted F1:",
        round(
            test_metrics[
                "Weighted F1"
            ]
            * 100,
            2
        ),
        "%"
    )


    print(
        "Specificity:",
        round(
            test_metrics[
                "Specificity"
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


    print(
        "PR-AUC:",
        round(
            test_metrics[
                "PR-AUC"
            ]
            * 100,
            2
        ),
        "%"
    )


    print(
        "\nConfusion Matrix:"
    )


    print(
        [
            [
                test_metrics[
                    "TN"
                ],
                test_metrics[
                    "FP"
                ]
            ],
            [
                test_metrics[
                    "FN"
                ],
                test_metrics[
                    "TP"
                ]
            ]
        ]
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
            f"junyi_"
            f"{safe_name}_"
            f"gradient_boosting.pkl"
        )
    )


    feature_path = os.path.join(
        MODEL_DIR,
        (
            f"junyi_"
            f"{safe_name}_"
            f"features.pkl"
        )
    )


    threshold_path = os.path.join(
        MODEL_DIR,
        (
            f"junyi_"
            f"{safe_name}_"
            f"threshold.pkl"
        )
    )


    joblib.dump(
        final_model,
        model_path,
        compress=3
    )


    joblib.dump(
        features,
        feature_path,
        compress=3
    )


    joblib.dump(
        best_threshold,
        threshold_path,
        compress=3
    )



# ============================================================
# STUDENT-LEVEL CLUSTERED BOOTSTRAP ANALYSIS
# ============================================================

BOOTSTRAP_ITERATIONS = 2000
BOOTSTRAP_RANDOM_STATE = 42

paired_test_predictions = pd.DataFrame({
    "user_id": test_df["user_id"].to_numpy(),
    "y_true": test_df["binary_target"].to_numpy(dtype=int),
    "prob_academic": test_prediction_store["Academic Only"],
    "prob_academic_engagement": test_prediction_store[
        "Academic + Engagement"
    ],
})

PREDICTION_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "junyi_test_predictions.csv"
)
paired_test_predictions.to_csv(
    PREDICTION_REPORT_PATH,
    index=False
)

paired_test_predictions = paired_test_predictions.reset_index(drop=True)

student_row_indices = {
    student_id: group.index.to_numpy()
    for student_id, group in paired_test_predictions.groupby("user_id")
}

unique_test_students = np.array(
    list(student_row_indices.keys()),
    dtype=object
)

rng = np.random.default_rng(BOOTSTRAP_RANDOM_STATE)


def bootstrap_metric_values(y_true, probabilities, threshold):
    predictions = (probabilities >= threshold).astype(int)

    return {
        "ROC-AUC": roc_auc_score(y_true, probabilities),
        "PR-AUC": average_precision_score(y_true, probabilities),
        "High Risk Recall": recall_score(
            y_true,
            predictions,
            pos_label=1,
            zero_division=0
        ),
        "High Risk F1": f1_score(
            y_true,
            predictions,
            pos_label=1,
            zero_division=0
        ),
    }


metrics_of_interest = [
    "ROC-AUC",
    "PR-AUC",
    "High Risk Recall",
    "High Risk F1",
]

bootstrap_samples = {
    "Academic Only": {m: [] for m in metrics_of_interest},
    "Academic + Engagement": {m: [] for m in metrics_of_interest},
}

paired_difference_samples = {
    m: [] for m in metrics_of_interest
}

print("\n==========================================")
print("STUDENT-LEVEL BOOTSTRAP")
print("==========================================")
print("Requested iterations:", BOOTSTRAP_ITERATIONS)
print("Test students:", len(unique_test_students))

valid_bootstrap_iterations = 0

for bootstrap_iteration in range(BOOTSTRAP_ITERATIONS):

    sampled_students = rng.choice(
        unique_test_students,
        size=len(unique_test_students),
        replace=True
    )

    sampled_row_indices = np.concatenate([
        student_row_indices[student_id]
        for student_id in sampled_students
    ])

    bootstrap_df = paired_test_predictions.iloc[
        sampled_row_indices
    ]

    y_boot = bootstrap_df["y_true"].to_numpy(dtype=int)

    if np.unique(y_boot).size < 2:
        continue

    academic_metrics_boot = bootstrap_metric_values(
        y_boot,
        bootstrap_df["prob_academic"].to_numpy(dtype=float),
        selected_thresholds["Academic Only"]
    )

    engagement_metrics_boot = bootstrap_metric_values(
        y_boot,
        bootstrap_df[
            "prob_academic_engagement"
        ].to_numpy(dtype=float),
        selected_thresholds["Academic + Engagement"]
    )

    for metric_name in metrics_of_interest:
        bootstrap_samples[
            "Academic Only"
        ][metric_name].append(
            academic_metrics_boot[metric_name]
        )

        bootstrap_samples[
            "Academic + Engagement"
        ][metric_name].append(
            engagement_metrics_boot[metric_name]
        )

        paired_difference_samples[
            metric_name
        ].append(
            engagement_metrics_boot[metric_name]
            - academic_metrics_boot[metric_name]
        )

    valid_bootstrap_iterations += 1

    if (
        (bootstrap_iteration + 1) % 250 == 0
        or bootstrap_iteration == 0
    ):
        print(
            "Completed:",
            bootstrap_iteration + 1,
            "/",
            BOOTSTRAP_ITERATIONS
        )


observed_metrics = {
    "Academic Only": bootstrap_metric_values(
        paired_test_predictions["y_true"].to_numpy(dtype=int),
        paired_test_predictions["prob_academic"].to_numpy(dtype=float),
        selected_thresholds["Academic Only"]
    ),
    "Academic + Engagement": bootstrap_metric_values(
        paired_test_predictions["y_true"].to_numpy(dtype=int),
        paired_test_predictions[
            "prob_academic_engagement"
        ].to_numpy(dtype=float),
        selected_thresholds["Academic + Engagement"]
    ),
}


bootstrap_ci_rows = []

for experiment_name in [
    "Academic Only",
    "Academic + Engagement"
]:
    for metric_name in metrics_of_interest:

        values = np.asarray(
            bootstrap_samples[experiment_name][metric_name],
            dtype=float
        )

        ci_lower, ci_upper = np.percentile(
            values,
            [2.5, 97.5]
        )

        bootstrap_ci_rows.append({
            "Experiment": experiment_name,
            "Metric": metric_name,
            "Observed Estimate":
                observed_metrics[experiment_name][metric_name],
            "CI Lower 95%": ci_lower,
            "CI Upper 95%": ci_upper,
            "Bootstrap Iterations":
                valid_bootstrap_iterations,
        })


bootstrap_ci_df = pd.DataFrame(
    bootstrap_ci_rows
)

BOOTSTRAP_CI_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "junyi_student_bootstrap_95ci.csv"
)
bootstrap_ci_df.to_csv(
    BOOTSTRAP_CI_REPORT_PATH,
    index=False
)


paired_rows = []

for metric_name in metrics_of_interest:

    values = np.asarray(
        paired_difference_samples[metric_name],
        dtype=float
    )

    ci_lower, ci_upper = np.percentile(
        values,
        [2.5, 97.5]
    )

    observed_difference = (
        observed_metrics[
            "Academic + Engagement"
        ][metric_name]
        - observed_metrics[
            "Academic Only"
        ][metric_name]
    )

    if ci_lower > 0:
        interpretation = (
            "CI excludes 0; evidence favors Academic + Engagement"
        )
    elif ci_upper < 0:
        interpretation = (
            "CI excludes 0; evidence favors Academic Only"
        )
    else:
        interpretation = (
            "CI includes 0; difference is not statistically robust"
        )

    paired_rows.append({
        "Metric": metric_name,
        "Observed Difference (A+E - Academic)":
            observed_difference,
        "Difference CI Lower 95%":
            ci_lower,
        "Difference CI Upper 95%":
            ci_upper,
        "Bootstrap Iterations":
            valid_bootstrap_iterations,
        "Interpretation":
            interpretation,
    })


paired_bootstrap_df = pd.DataFrame(
    paired_rows
)

PAIRED_BOOTSTRAP_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "junyi_paired_bootstrap_differences.csv"
)
paired_bootstrap_df.to_csv(
    PAIRED_BOOTSTRAP_REPORT_PATH,
    index=False
)


print("\n==========================================")
print("BOOTSTRAP 95% CONFIDENCE INTERVALS")
print("==========================================")

bootstrap_print_df = bootstrap_ci_df.copy()

for column in [
    "Observed Estimate",
    "CI Lower 95%",
    "CI Upper 95%",
]:
    bootstrap_print_df[column] = (
        bootstrap_print_df[column] * 100
    ).round(2)

print(
    bootstrap_print_df.to_string(index=False)
)


print("\n==========================================")
print("PAIRED BOOTSTRAP DIFFERENCE")
print("A+E - ACADEMIC")
print("==========================================")

paired_print_df = paired_bootstrap_df.copy()

for column in [
    "Observed Difference (A+E - Academic)",
    "Difference CI Lower 95%",
    "Difference CI Upper 95%",
]:
    paired_print_df[column] = (
        paired_print_df[column] * 100
    ).round(2)

print(
    paired_print_df.to_string(index=False)
)


# ============================================================
# SAVE EXPERIMENT REPORTS
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
    "junyi_academic_vs_engagement_results.csv"
)


HYPERPARAMETER_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "junyi_academic_vs_engagement_hyperparameters.csv"
)


THRESHOLD_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "junyi_academic_vs_engagement_thresholds.csv"
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
# CREATE IMPROVEMENT REPORT
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
    "PR-AUC",
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


    improvement_pp = (
        engagement_value
        - academic_value
    ) * 100


    comparison_rows.append({

        "Metric":
            metric,

        "Academic Only":
            academic_value,

        "Academic + Engagement":
            engagement_value,

        "Improvement Percentage Points":
            improvement_pp,
    })


comparison_df = pd.DataFrame(
    comparison_rows
)


IMPROVEMENT_REPORT_PATH = os.path.join(
    REPORT_DIR,
    "junyi_academic_vs_engagement_improvement.csv"
)


comparison_df.to_csv(
    IMPROVEMENT_REPORT_PATH,
    index=False
)


# ============================================================
# FINAL DISPLAY TABLE
# ============================================================

print(
    "\n\n=========================================="
)

print(
    "JUNYI FINAL COMPARISON"
)

print(
    "=========================================="
)


display_df = final_results_df[
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
        "PR-AUC",
    ]
].copy()


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
    "PR-AUC",
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


# ============================================================
# ENGAGEMENT IMPROVEMENT TABLE
# ============================================================

print(
    "\n=========================================="
)

print(
    "ENGAGEMENT IMPROVEMENT"
)

print(
    "=========================================="
)


improvement_display = (
    comparison_df.copy()
)


improvement_display[
    "Academic Only"
] = (
    improvement_display[
        "Academic Only"
    ]
    * 100
).round(
    2
)


improvement_display[
    "Academic + Engagement"
] = (
    improvement_display[
        "Academic + Engagement"
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
    improvement_display.to_string(
        index=False
    )
)


# ============================================================
# SAVE SPLIT INFORMATION
# ============================================================

SPLIT_PATH = os.path.join(
    MODEL_DIR,
    "junyi_academic_vs_engagement_student_split.pkl"
)


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

    "test_size":
        0.20,

    "validation_size_from_development":
        0.20,
}


joblib.dump(
    split_info,
    SPLIT_PATH,
    compress=3
)


# ============================================================
# FINAL PATH SUMMARY
# ============================================================

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
    "\nFinal results:"
)

print(
    FINAL_REPORT_PATH
)


print(
    "\nEngagement improvement:"
)

print(
    IMPROVEMENT_REPORT_PATH
)


print(
    "\nHyperparameter results:"
)

print(
    HYPERPARAMETER_REPORT_PATH
)


print(
    "\nThreshold results:"
)

print(
    THRESHOLD_REPORT_PATH
)


print(
    "\nStudent split:"
)

print(
    SPLIT_PATH
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
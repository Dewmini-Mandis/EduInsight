import os
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
    confusion_matrix
)
from sklearn.utils.class_weight import compute_class_weight

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier
)

from xgboost import XGBClassifier


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = (
    "ml/data_pipeline/assistments_risk_training_v3.csv"
)

MODEL_DIR = "ml/models"

REPORT_PATH = (
    "ml/model_comparison_report_v3_binary.csv"
)

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
# LOAD DATA
# ============================================================

print("==========================================")
print("ASSISTMENTS V3 BINARY RISK COMPARISON")
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
    df[GROUP_COLUMN].nunique()
)


# ============================================================
# VALIDATE COLUMNS
# ============================================================

required_columns = (
    FEATURES
    + [
        "future_accuracy",
        GROUP_COLUMN
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
    [np.inf, -np.inf],
    np.nan
)

before_cleaning = len(df)

df = df.dropna(
    subset=required_columns
).copy()

after_cleaning = len(df)

print(
    "Rows removed due to NaN/Inf:",
    before_cleaning - after_cleaning
)


# ============================================================
# CREATE BINARY TARGET
# ============================================================
#
# 1 = High Risk
# 0 = Not High Risk
#
# High Risk:
# future accuracy < 0.50
#
# Not High Risk:
# future accuracy >= 0.50
# ============================================================

df["binary_risk"] = np.where(
    df["future_accuracy"] < 0.50,
    1,
    0
)


print(
    "\nBinary target definition:"
)

print(
    "1 = High Risk       (future_accuracy < 0.50)"
)

print(
    "0 = Not High Risk   (future_accuracy >= 0.50)"
)


print(
    "\nBinary target distribution:"
)

binary_counts = (
    df["binary_risk"]
    .value_counts()
    .sort_index()
)

print(binary_counts)


print(
    "\nBinary target percentages:"
)

binary_percentages = (
    df["binary_risk"]
    .value_counts(
        normalize=True
    )
    .sort_index()
    .mul(100)
    .round(2)
)

print(binary_percentages)


# ============================================================
# PREPARE X, Y, GROUPS
# ============================================================

X = df[
    FEATURES
].copy()

y = df[
    "binary_risk"
].astype(int).values

groups = df[
    GROUP_COLUMN
].copy()


# ============================================================
# STUDENT-WISE SPLIT
# ============================================================

print(
    "\nCreating student-wise train/test split..."
)

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

train_groups = groups.iloc[
    train_index
]

test_groups = groups.iloc[
    test_index
]


print(
    "\nTraining samples:",
    len(X_train)
)

print(
    "Testing samples:",
    len(X_test)
)

print(
    "Training students:",
    train_groups.nunique()
)

print(
    "Testing students:",
    test_groups.nunique()
)


# ============================================================
# LEAKAGE CHECK
# ============================================================

train_students = set(
    train_groups.unique()
)

test_students = set(
    test_groups.unique()
)

student_overlap = (
    train_students
    .intersection(
        test_students
    )
)

print(
    "Students appearing in both train and test:",
    len(student_overlap)
)

if student_overlap:

    raise ValueError(
        "Student leakage detected."
    )


# ============================================================
# TRAIN / TEST CLASS DISTRIBUTION
# ============================================================

print(
    "\nTraining class distribution:"
)

print(
    pd.Series(
        y_train
    ).value_counts().sort_index()
)

print(
    "\nTesting class distribution:"
)

print(
    pd.Series(
        y_test
    ).value_counts().sort_index()
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


print(
    "\n=========================================="
)

print(
    "CLASS WEIGHTS"
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


sample_weights = np.array([
    class_weight_dict[label]
    for label in y_train
])


# ============================================================
# XGBOOST POSITIVE CLASS WEIGHT
# ============================================================

negative_count = np.sum(
    y_train == 0
)

positive_count = np.sum(
    y_train == 1
)

scale_pos_weight = (
    negative_count
    / positive_count
)


print(
    "\nXGBoost scale_pos_weight:",
    round(
        scale_pos_weight,
        4
    )
)


# ============================================================
# MODELS
# ============================================================

models = {

    "Logistic Regression": Pipeline(
        steps=[
            (
                "scaler",
                StandardScaler()
            ),
            (
                "model",
                LogisticRegression(
                    max_iter=3000,
                    class_weight="balanced",
                    random_state=42
                )
            )
        ]
    ),

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

    "XGBoost": XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.04,

        min_child_weight=3,

        subsample=0.85,
        colsample_bytree=0.85,

        reg_alpha=0.1,
        reg_lambda=1.0,

        objective="binary:logistic",
        eval_metric="logloss",

        scale_pos_weight=scale_pos_weight,

        tree_method="hist",

        random_state=42,
        n_jobs=-1
    ),
}


# ============================================================
# RESULT STORAGE
# ============================================================

results = []

trained_models = {}

best_model_name = None
best_f1 = -1


# ============================================================
# TRAIN AND EVALUATE
# ============================================================

for model_name, model in models.items():

    print(
        "\n\n=========================================="
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
    # PREDICTIONS
    # --------------------------------------------------------

    y_pred = model.predict(
        X_test
    )


    # --------------------------------------------------------
    # PROBABILITIES
    # --------------------------------------------------------

    if hasattr(
        model,
        "predict_proba"
    ):

        y_probability = model.predict_proba(
            X_test
        )[:, 1]

    else:

        y_probability = None


    # --------------------------------------------------------
    # METRICS
    # --------------------------------------------------------

    accuracy = accuracy_score(
        y_test,
        y_pred
    )

    balanced_accuracy = balanced_accuracy_score(
        y_test,
        y_pred
    )

    precision = precision_score(
        y_test,
        y_pred,
        pos_label=1,
        zero_division=0
    )

    high_risk_recall = recall_score(
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


    if y_probability is not None:

        roc_auc = roc_auc_score(
            y_test,
            y_probability
        )

    else:

        roc_auc = np.nan


    # --------------------------------------------------------
    # SPECIFICITY
    # --------------------------------------------------------

    matrix = confusion_matrix(
        y_test,
        y_pred,
        labels=[0, 1]
    )

    tn, fp, fn, tp = matrix.ravel()

    specificity = (
        tn
        / (tn + fp)
        if (tn + fp) > 0
        else 0
    )


    # --------------------------------------------------------
    # PRINT RESULTS
    # --------------------------------------------------------

    print(
        "\nAccuracy:",
        round(
            accuracy,
            4
        )
    )

    print(
        "Balanced Accuracy:",
        round(
            balanced_accuracy,
            4
        )
    )

    print(
        "High Risk Precision:",
        round(
            precision,
            4
        )
    )

    print(
        "High Risk Recall:",
        round(
            high_risk_recall,
            4
        )
    )

    print(
        "High Risk F1:",
        round(
            high_risk_f1,
            4
        )
    )

    print(
        "Macro F1:",
        round(
            macro_f1,
            4
        )
    )

    print(
        "Specificity:",
        round(
            specificity,
            4
        )
    )

    print(
        "ROC-AUC:",
        round(
            roc_auc,
            4
        )
    )


    print(
        "\nClassification Report:"
    )

    print(
        classification_report(
            y_test,
            y_pred,
            target_names=[
                "Not High Risk",
                "High Risk"
            ],
            digits=4,
            zero_division=0
        )
    )


    print(
        "\nConfusion Matrix:"
    )

    print(
        matrix
    )

    print(
        "\nConfusion Matrix format:"
    )

    print(
        "[[TN FP]"
    )

    print(
        " [FN TP]]"
    )


    # --------------------------------------------------------
    # STORE RESULTS
    # --------------------------------------------------------

    results.append({

        "Model":
            model_name,

        "Accuracy":
            accuracy,

        "Balanced Accuracy":
            balanced_accuracy,

        "High Risk Precision":
            precision,

        "High Risk Recall":
            high_risk_recall,

        "High Risk F1":
            high_risk_f1,

        "Macro F1":
            macro_f1,

        "Specificity":
            specificity,

        "ROC-AUC":
            roc_auc,
    })


    trained_models[
        model_name
    ] = model


    # --------------------------------------------------------
    # SELECT BEST MODEL
    #
    # Use High-Risk F1 as the main selection metric because
    # the purpose of this model is identifying at-risk students.
    # --------------------------------------------------------

    if high_risk_f1 > best_f1:

        best_f1 = high_risk_f1

        best_model_name = model_name


# ============================================================
# FINAL COMPARISON
# ============================================================

results_df = pd.DataFrame(
    results
)

results_df = (
    results_df
    .sort_values(
        by="High Risk F1",
        ascending=False
    )
    .reset_index(
        drop=True
    )
)


print(
    "\n\n=========================================="
)

print(
    "FINAL BINARY MODEL COMPARISON"
)

print(
    "=========================================="
)


print(
    results_df.to_string(
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
    "ROC-AUC",
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


print(
    "\n=========================================="
)

print(
    "PERCENTAGE COMPARISON"
)

print(
    "=========================================="
)


print(
    percentage_report.to_string(
        index=False
    )
)


# ============================================================
# SAVE REPORT
# ============================================================

percentage_report.to_csv(
    REPORT_PATH,
    index=False
)


print(
    "\nBinary comparison report saved to:"
)

print(
    REPORT_PATH
)


# ============================================================
# BEST MODEL
# ============================================================

print(
    "\n=========================================="
)

print(
    "BEST BINARY MODEL"
)

print(
    "=========================================="
)


print(
    "Best model:",
    best_model_name
)

print(
    "Best High Risk F1:",
    round(
        best_f1,
        4
    )
)


# ============================================================
# SAVE BEST MODEL
# ============================================================

best_model = trained_models[
    best_model_name
]


safe_model_name = (
    best_model_name
    .lower()
    .replace(
        " ",
        "_"
    )
)


BEST_MODEL_PATH = os.path.join(
    MODEL_DIR,
    (
        f"assistments_v3_binary_"
        f"{safe_model_name}_risk_model.pkl"
    )
)


FEATURE_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_binary_risk_features.pkl"
)


TARGET_INFO_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_binary_target_info.pkl"
)


joblib.dump(
    best_model,
    BEST_MODEL_PATH,
    compress=3
)


joblib.dump(
    FEATURES,
    FEATURE_PATH,
    compress=3
)


target_info = {
    "0": "Not High Risk",
    "1": "High Risk",
    "threshold": 0.50,
    "definition": (
        "High Risk if future_accuracy < 0.50; "
        "otherwise Not High Risk"
    )
}


joblib.dump(
    target_info,
    TARGET_INFO_PATH,
    compress=3
)


print(
    "\nBest binary model saved to:"
)

print(
    BEST_MODEL_PATH
)


print(
    "\nFeatures saved to:"
)

print(
    FEATURE_PATH
)


print(
    "\nTarget information saved to:"
)

print(
    TARGET_INFO_PATH
)


# ============================================================
# SAVE STUDENT SPLIT
# ============================================================

SPLIT_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_binary_student_split.pkl"
)


split_information = {

    "train_students":
        sorted(
            list(
                train_students
            )
        ),

    "test_students":
        sorted(
            list(
                test_students
            )
        ),

    "random_state":
        42,

    "test_size":
        0.20,
}


joblib.dump(
    split_information,
    SPLIT_PATH,
    compress=3
)


print(
    "\nStudent split saved to:"
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
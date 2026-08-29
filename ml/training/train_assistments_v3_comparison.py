import os
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    recall_score,
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
    "ml/model_comparison_report_v3_weighted.csv"
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

TARGET = "risk_level"
GROUP_COLUMN = "user_id"


# ============================================================
# LOAD DATA
# ============================================================

print("==========================================")
print("ASSISTMENTS V3 WEIGHTED MODEL COMPARISON")
print("==========================================")

print("\nLoading V3 training dataset...")

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
        TARGET,
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
# PREPARE DATA
# ============================================================

X = df[
    FEATURES
].copy()

y_text = df[
    TARGET
].copy()

groups = df[
    GROUP_COLUMN
].copy()


print("\nTarget distribution:")

print(
    y_text.value_counts()
)


print("\nTarget percentages:")

print(
    (
        y_text.value_counts(
            normalize=True
        )
        * 100
    ).round(2)
)


# ============================================================
# LABEL ENCODING
# ============================================================

encoder = LabelEncoder()

y = encoder.fit_transform(
    y_text
)


print("\nEncoded classes:")

for class_name, class_number in zip(
    encoder.classes_,
    encoder.transform(
        encoder.classes_
    )
):

    print(
        class_name,
        "->",
        class_number
    )


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

train_student_set = set(
    train_groups.unique()
)

test_student_set = set(
    test_groups.unique()
)

overlap = (
    train_student_set
    .intersection(
        test_student_set
    )
)

print(
    "Students appearing in both train and test:",
    len(overlap)
)

if len(overlap) > 0:

    raise ValueError(
        "Student leakage detected."
    )


# ============================================================
# CLASS DISTRIBUTION
# ============================================================

print(
    "\nTraining target distribution:"
)

print(
    pd.Series(
        encoder.inverse_transform(
            y_train
        )
    ).value_counts()
)


print(
    "\nTesting target distribution:"
)

print(
    pd.Series(
        encoder.inverse_transform(
            y_test
        )
    ).value_counts()
)


# ============================================================
# COMPUTE BALANCED CLASS WEIGHTS
# ============================================================

classes = np.unique(
    y_train
)

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
        n_estimators=400,
        max_depth=14,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    ),

    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=200,
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

        objective="multi:softprob",
        eval_metric="mlogloss",

        tree_method="hist",

        random_state=42,
        n_jobs=-1
    ),
}


# ============================================================
# RESULTS
# ============================================================

results = []

trained_models = {}

best_model_name = None
best_macro_f1 = -1


# ============================================================
# TRAIN / EVALUATE
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

    if model_name in [
        "Gradient Boosting",
        "XGBoost"
    ]:

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
    # PREDICT
    # --------------------------------------------------------

    y_pred = model.predict(
        X_test
    )


    # --------------------------------------------------------
    # METRICS
    # --------------------------------------------------------

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


    recalls = recall_score(
        y_test,
        y_pred,
        labels=np.arange(
            len(
                encoder.classes_
            )
        ),
        average=None,
        zero_division=0
    )


    recall_dict = dict(
        zip(
            encoder.classes_,
            recalls
        )
    )


    high_recall = recall_dict.get(
        "High",
        0
    )

    medium_recall = recall_dict.get(
        "Medium",
        0
    )

    low_recall = recall_dict.get(
        "Low",
        0
    )


    # --------------------------------------------------------
    # PRINT
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
        "Macro F1:",
        round(
            macro_f1,
            4
        )
    )

    print(
        "Weighted F1:",
        round(
            weighted_f1,
            4
        )
    )

    print(
        "High Recall:",
        round(
            high_recall,
            4
        )
    )

    print(
        "Medium Recall:",
        round(
            medium_recall,
            4
        )
    )

    print(
        "Low Recall:",
        round(
            low_recall,
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
            target_names=encoder.classes_,
            digits=4,
            zero_division=0
        )
    )


    print(
        "\nConfusion Matrix:"
    )

    print(
        confusion_matrix(
            y_test,
            y_pred
        )
    )

    print(
        "\nConfusion Matrix labels:"
    )

    print(
        encoder.classes_
    )


    # --------------------------------------------------------
    # STORE
    # --------------------------------------------------------

    results.append({

        "Model":
            model_name,

        "Accuracy":
            accuracy,

        "Balanced Accuracy":
            balanced_accuracy,

        "Macro F1":
            macro_f1,

        "Weighted F1":
            weighted_f1,

        "High Recall":
            high_recall,

        "Medium Recall":
            medium_recall,

        "Low Recall":
            low_recall,
    })


    trained_models[
        model_name
    ] = model


    if macro_f1 > best_macro_f1:

        best_macro_f1 = macro_f1

        best_model_name = model_name


# ============================================================
# FINAL REPORT
# ============================================================

results_df = pd.DataFrame(
    results
)

results_df = (
    results_df
    .sort_values(
        by="Macro F1",
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
    "FINAL WEIGHTED MODEL COMPARISON"
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
# PERCENTAGES
# ============================================================

percentage_report = (
    results_df.copy()
)


metric_columns = [
    "Accuracy",
    "Balanced Accuracy",
    "Macro F1",
    "Weighted F1",
    "High Recall",
    "Medium Recall",
    "Low Recall",
]


for column in metric_columns:

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
    "\nWeighted comparison report saved to:"
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
    "BEST WEIGHTED MODEL"
)

print(
    "=========================================="
)


print(
    "Best model:",
    best_model_name
)

print(
    "Best Macro F1:",
    round(
        best_macro_f1,
        4
    )
)


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
    f"assistments_v3_weighted_{safe_model_name}_risk_model.pkl"
)


ENCODER_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_weighted_risk_label_encoder.pkl"
)


FEATURE_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_weighted_risk_features.pkl"
)


joblib.dump(
    best_model,
    BEST_MODEL_PATH,
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
    "\nBest weighted model saved to:"
)

print(
    BEST_MODEL_PATH
)


print(
    "\nEncoder saved to:"
)

print(
    ENCODER_PATH
)


print(
    "\nFeatures saved to:"
)

print(
    FEATURE_PATH
)


# ============================================================
# SAVE SPLIT
# ============================================================

split_info = {

    "train_students":
        sorted(
            list(
                train_student_set
            )
        ),

    "test_students":
        sorted(
            list(
                test_student_set
            )
        ),

    "random_state":
        42,

    "test_size":
        0.20,
}


SPLIT_PATH = os.path.join(
    MODEL_DIR,
    "assistments_v3_weighted_student_split.pkl"
)


joblib.dump(
    split_info,
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
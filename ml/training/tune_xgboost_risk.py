import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    recall_score
)

from xgboost import XGBClassifier


# ==========================================
# Load dataset
# ==========================================

DATA_PATH = "ml/data_pipeline/risk_training_data_full.csv"

print("Loading dataset...")

df = pd.read_csv(DATA_PATH)

print("Dataset:", df.shape)


# ==========================================
# Features
# ==========================================

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

X = df[FEATURES]

encoder = LabelEncoder()

y = encoder.fit_transform(
    df["risk_level"]
)

print("Classes:")

for name, number in zip(
    encoder.classes_,
    encoder.transform(encoder.classes_)
):
    print(name, "->", number)


# ==========================================
# SAME train/test split
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# ==========================================
# Weight experiments
#
# Encoded:
# High   = 0
# Low    = 1
# Medium = 2
# ==========================================

experiments = [

    {
        "name": "Balanced",
        "High": 1.25,
        "Low": 0.63,
        "Medium": 1.63
    },

    {
        "name": "Medium_2.0",
        "High": 1.30,
        "Low": 0.70,
        "Medium": 2.00
    },

    {
        "name": "Medium_2.5",
        "High": 1.40,
        "Low": 0.65,
        "Medium": 2.50
    },

    {
        "name": "Medium_3.0",
        "High": 1.50,
        "Low": 0.60,
        "Medium": 3.00
    }
]


results = []


# ==========================================
# Train each experiment
# ==========================================

for experiment in experiments:

    print("\n===================================")
    print("Training:", experiment["name"])
    print("===================================")

    weight_map = {
        0: experiment["High"],
        1: experiment["Low"],
        2: experiment["Medium"]
    }

    sample_weights = np.array([
        weight_map[label]
        for label in y_train
    ])

    model = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        min_child_weight=3,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="multi:softprob",
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=42,
        n_jobs=-1
    )

    model.fit(
        X_train,
        y_train,
        sample_weight=sample_weights
    )

    predictions = model.predict(
        X_test
    )

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    balanced_accuracy = balanced_accuracy_score(
        y_test,
        predictions
    )

    macro_f1 = f1_score(
        y_test,
        predictions,
        average="macro"
    )

    recalls = recall_score(
        y_test,
        predictions,
        average=None,
        labels=[0, 1, 2]
    )

    high_recall = recalls[0]
    low_recall = recalls[1]
    medium_recall = recalls[2]

    results.append({
        "model": experiment["name"],
        "accuracy": accuracy,
        "balanced_accuracy": balanced_accuracy,
        "macro_f1": macro_f1,
        "high_recall": high_recall,
        "medium_recall": medium_recall,
        "low_recall": low_recall
    })

    print("Accuracy:", round(accuracy, 4))
    print(
        "Balanced Accuracy:",
        round(balanced_accuracy, 4)
    )
    print(
        "Macro F1:",
        round(macro_f1, 4)
    )

    print(
        "High Recall:",
        round(high_recall, 4)
    )

    print(
        "Medium Recall:",
        round(medium_recall, 4)
    )

    print(
        "Low Recall:",
        round(low_recall, 4)
    )


# ==========================================
# Comparison
# ==========================================

results_df = pd.DataFrame(results)

results_df = results_df.sort_values(
    "macro_f1",
    ascending=False
)

print("\n\n===================================")
print("FINAL COMPARISON")
print("===================================")

print(
    results_df.to_string(
        index=False
    )
)


# ==========================================
# Best experiment
# ==========================================

best = results_df.iloc[0]

print("\n===================================")
print("BEST CONFIGURATION")
print("===================================")

print("Model:", best["model"])
print(
    "Macro F1:",
    round(best["macro_f1"], 4)
)
print(
    "Balanced Accuracy:",
    round(best["balanced_accuracy"], 4)
)
print(
    "High Recall:",
    round(best["high_recall"], 4)
)
print(
    "Medium Recall:",
    round(best["medium_recall"], 4)
)
print(
    "Low Recall:",
    round(best["low_recall"], 4)
)
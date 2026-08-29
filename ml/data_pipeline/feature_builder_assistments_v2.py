import pandas as pd
import numpy as np

DATA_PATH = (
    r"C:\Users\dewmi\Downloads\ASSISTments"
    r"\2012-2013-data-with-predictions-4-final.csv"
)

OUTPUT_PATH = (
    "ml/data_pipeline/assistments_risk_training_v2.csv"
)

USE_COLUMNS = [
    "user_id",
    "skill_id",
    "start_time",
    "correct",
    "attempt_count",
    "hint_count",
    "ms_first_response",
    "bottom_hint",
    "first_action",
    "Average_confidence(FRUSTRATED)",
    "Average_confidence(CONFUSED)",
    "Average_confidence(CONCENTRATING)",
    "Average_confidence(BORED)"
]

print("Loading ASSISTments dataset...")

df = pd.read_csv(
    DATA_PATH,
    usecols=USE_COLUMNS
)

print("Raw rows:", len(df))

# --------------------------------------------------
# Basic cleaning
# --------------------------------------------------

df = df.dropna(
    subset=[
        "user_id",
        "skill_id",
        "start_time",
        "correct",
        "attempt_count",
        "hint_count",
        "ms_first_response"
    ]
).copy()

df["start_time"] = pd.to_datetime(
    df["start_time"],
    errors="coerce"
)

df = df.dropna(
    subset=["start_time"]
)

numeric_columns = [
    "correct",
    "attempt_count",
    "hint_count",
    "ms_first_response",
    "bottom_hint",
    "first_action",
    "Average_confidence(FRUSTRATED)",
    "Average_confidence(CONFUSED)",
    "Average_confidence(CONCENTRATING)",
    "Average_confidence(BORED)"
]

for column in numeric_columns:
    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )

# Behavioral/affective missing values:
# fill with median instead of dropping large numbers of rows
for column in [
    "bottom_hint",
    "first_action",
    "Average_confidence(FRUSTRATED)",
    "Average_confidence(CONFUSED)",
    "Average_confidence(CONCENTRATING)",
    "Average_confidence(BORED)"
]:
    df[column] = df[column].fillna(
        df[column].median()
    )

df = df.dropna(
    subset=[
        "correct",
        "attempt_count",
        "hint_count",
        "ms_first_response"
    ]
)

df = df[
    (df["correct"] >= 0) &
    (df["correct"] <= 1) &
    (df["attempt_count"] >= 0) &
    (df["hint_count"] >= 0) &
    (df["ms_first_response"] >= 0)
].copy()

# --------------------------------------------------
# Response time
# --------------------------------------------------

df["response_time_sec"] = (
    df["ms_first_response"] / 1000
)

time_cap = df["response_time_sec"].quantile(0.99)

df["response_time_sec"] = (
    df["response_time_sec"]
    .clip(upper=time_cap)
)

df["hint_used"] = (
    df["hint_count"] > 0
).astype(int)

# --------------------------------------------------
# Sort
# --------------------------------------------------

df = df.sort_values(
    by=[
        "user_id",
        "skill_id",
        "start_time"
    ]
)

print("Clean rows:", len(df))

# Need 15 interactions:
# past 10 + future 5
pair_counts = (
    df.groupby(
        ["user_id", "skill_id"]
    )
    .size()
)

valid_pairs = pair_counts[
    pair_counts >= 15
].index

print(
    "Valid student-skill pairs:",
    len(valid_pairs)
)

df["pair"] = list(
    zip(
        df["user_id"],
        df["skill_id"]
    )
)

valid_pair_set = set(valid_pairs)

df = df[
    df["pair"].isin(valid_pair_set)
].copy()

df = df.drop(columns=["pair"])

rows = []

# --------------------------------------------------
# Helper functions
# --------------------------------------------------

def longest_streak(values, success=True):

    longest = 0
    current = 0

    for value in values:

        condition = (
            value >= 0.5
            if success
            else value < 0.5
        )

        if condition:
            current += 1
            longest = max(
                longest,
                current
            )
        else:
            current = 0

    return longest


def linear_trend(values):

    values = np.asarray(
        values,
        dtype=float
    )

    if len(values) < 2:
        return 0.0

    x = np.arange(
        len(values)
    )

    slope = np.polyfit(
        x,
        values,
        1
    )[0]

    return float(slope)


# --------------------------------------------------
# Build ML rows
# --------------------------------------------------

for (student_id, skill_id), group in df.groupby(
    ["user_id", "skill_id"]
):

    group = group.sort_values(
        "start_time"
    )

    if len(group) < 15:
        continue

    # past 10 interactions
    past = group.iloc[:10]

    # future 5 interactions
    future = group.iloc[10:15]

    early = past.iloc[:5]
    recent = past.iloc[5:10]

    # Accuracy
    past_accuracy = past["correct"].mean()
    early_accuracy = early["correct"].mean()
    recent_accuracy = recent["correct"].mean()

    improvement_rate = (
        recent_accuracy -
        early_accuracy
    )

    accuracy_trend = linear_trend(
        past["correct"].values
    )

    recent3_accuracy = (
        past["correct"]
        .iloc[-3:]
        .mean()
    )

    correct_streak = longest_streak(
        past["correct"].values,
        success=True
    )

    wrong_streak = longest_streak(
        past["correct"].values,
        success=False
    )

    # Time
    past_avg_time = (
        past["response_time_sec"]
        .mean()
    )

    past_median_time = (
        past["response_time_sec"]
        .median()
    )

    past_max_time = (
        past["response_time_sec"]
        .max()
    )

    past_min_time = (
        past["response_time_sec"]
        .min()
    )

    response_time_trend = linear_trend(
        past["response_time_sec"]
        .values
    )

    recent_avg_time = (
        recent["response_time_sec"]
        .mean()
    )

    # Attempts
    past_avg_attempts = (
        past["attempt_count"]
        .mean()
    )

    past_total_attempts = (
        past["attempt_count"]
        .sum()
    )

    past_max_attempts = (
        past["attempt_count"]
        .max()
    )

    attempt_trend = linear_trend(
        past["attempt_count"]
        .values
    )

    # Hints
    past_avg_hints = (
        past["hint_count"]
        .mean()
    )

    past_total_hints = (
        past["hint_count"]
        .sum()
    )

    past_hint_rate = (
        past["hint_used"]
        .mean()
    )

    hint_trend = linear_trend(
        past["hint_count"]
        .values
    )

    bottom_hint_rate = (
        past["bottom_hint"]
        .mean()
    )

    first_action_avg = (
        past["first_action"]
        .mean()
    )

    # Affective features
    avg_frustrated = (
        past[
            "Average_confidence(FRUSTRATED)"
        ].mean()
    )

    avg_confused = (
        past[
            "Average_confidence(CONFUSED)"
        ].mean()
    )

    avg_concentrating = (
        past[
            "Average_confidence(CONCENTRATING)"
        ].mean()
    )

    avg_bored = (
        past[
            "Average_confidence(BORED)"
        ].mean()
    )

    # Future target
    future_accuracy = (
        future["correct"]
        .mean()
    )

    rows.append({
        "user_id": student_id,
        "skill_id": skill_id,

        "past_accuracy": past_accuracy,
        "early_accuracy": early_accuracy,
        "recent_accuracy": recent_accuracy,
        "recent3_accuracy": recent3_accuracy,
        "improvement_rate": improvement_rate,
        "accuracy_trend": accuracy_trend,

        "correct_streak": correct_streak,
        "wrong_streak": wrong_streak,

        "past_avg_time": past_avg_time,
        "past_median_time": past_median_time,
        "past_max_time": past_max_time,
        "past_min_time": past_min_time,
        "recent_avg_time": recent_avg_time,
        "response_time_trend": response_time_trend,

        "past_avg_attempts": past_avg_attempts,
        "past_total_attempts": past_total_attempts,
        "past_max_attempts": past_max_attempts,
        "attempt_trend": attempt_trend,

        "past_avg_hints": past_avg_hints,
        "past_total_hints": past_total_hints,
        "past_hint_rate": past_hint_rate,
        "hint_trend": hint_trend,

        "bottom_hint_rate": bottom_hint_rate,
        "first_action_avg": first_action_avg,

        "avg_frustrated": avg_frustrated,
        "avg_confused": avg_confused,
        "avg_concentrating": avg_concentrating,
        "avg_bored": avg_bored,

        "future_accuracy": future_accuracy
    })


risk_df = pd.DataFrame(
    rows
)

print(
    "\nCreated V2 ML dataset:"
)

print(
    risk_df.shape
)

print(
    "\nFuture accuracy:"
)

print(
    risk_df[
        "future_accuracy"
    ].describe()
)


# --------------------------------------------------
# Risk labels
# --------------------------------------------------

def create_risk_label(score):

    if score >= 0.75:
        return "Low"

    elif score >= 0.50:
        return "Medium"

    else:
        return "High"


risk_df["risk_level"] = (
    risk_df[
        "future_accuracy"
    ].apply(
        create_risk_label
    )
)

print(
    "\nRisk distribution:"
)

print(
    risk_df[
        "risk_level"
    ].value_counts()
)

print(
    "\nRisk percentages:"
)

print(
    (
        risk_df[
            "risk_level"
        ]
        .value_counts(
            normalize=True
        )
        * 100
    ).round(2)
)


risk_df.to_csv(
    OUTPUT_PATH,
    index=False
)

print(
    "\nSaved to:"
)

print(
    OUTPUT_PATH
)
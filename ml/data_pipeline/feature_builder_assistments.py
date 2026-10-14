import pandas as pd
import numpy as np


# ==========================================================
# Paths
# ==========================================================

DATA_PATH = (
    r"C:\Users\dewmi\Downloads\ASSISTments"
    r"\2012-2013-data-with-predictions-4-final.csv"
)

OUTPUT_PATH = (
    "ml/data_pipeline/assistments_risk_training.csv"
)


# ==========================================================
# Columns
# ==========================================================

USE_COLUMNS = [
    "user_id",
    "skill_id",
    "start_time",
    "correct",
    "attempt_count",
    "hint_count",
    "ms_first_response"
]


print("Loading ASSISTments dataset...")


# ==========================================================
# Load
# ==========================================================

df = pd.read_csv(
    DATA_PATH,
    usecols=USE_COLUMNS
)

print("Raw rows:", len(df))


# ==========================================================
# Basic cleaning
# ==========================================================

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


# Convert time
df["start_time"] = pd.to_datetime(
    df["start_time"],
    errors="coerce"
)

df = df.dropna(
    subset=["start_time"]
)


# Convert numeric columns
numeric_columns = [
    "correct",
    "attempt_count",
    "hint_count",
    "ms_first_response"
]

for column in numeric_columns:

    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )


df = df.dropna(
    subset=numeric_columns
)


# ==========================================================
# Remove invalid values
# ==========================================================

df = df[
    (df["correct"] >= 0) &
    (df["correct"] <= 1) &
    (df["attempt_count"] >= 0) &
    (df["hint_count"] >= 0) &
    (df["ms_first_response"] >= 0)
].copy()


# ==========================================================
# Convert milliseconds to seconds
# ==========================================================

df["response_time_sec"] = (
    df["ms_first_response"] / 1000
)


# ==========================================================
# Handle extreme response-time outliers
#
# Cap at 99th percentile instead of deleting everything.
# ==========================================================

time_cap = df["response_time_sec"].quantile(0.99)

print(
    "99th percentile response time:",
    round(time_cap, 2),
    "seconds"
)

df["response_time_sec"] = (
    df["response_time_sec"]
    .clip(upper=time_cap)
)


# ==========================================================
# Hint-used feature
# ==========================================================

df["hint_used"] = (
    df["hint_count"] > 0
).astype(int)


# ==========================================================
# Sort student + skill + time
# ==========================================================

df = df.sort_values(
    by=[
        "user_id",
        "skill_id",
        "start_time"
    ]
)


print("Clean rows:", len(df))


# ==========================================================
# Student-skill pair counts
# ==========================================================

pair_counts = (
    df.groupby(
        ["user_id", "skill_id"]
    )
    .size()
)


valid_pairs = pair_counts[
    pair_counts >= 10
].index


print(
    "Valid student-skill pairs:",
    len(valid_pairs)
)


# ==========================================================
# Keep valid pairs
# ==========================================================

df["pair"] = list(
    zip(
        df["user_id"],
        df["skill_id"]
    )
)

valid_pair_set = set(
    valid_pairs
)

df = df[
    df["pair"].isin(
        valid_pair_set
    )
].copy()

df = df.drop(
    columns=["pair"]
)


# ==========================================================
# Build ML rows
# ==========================================================

rows = []


for (student_id, skill_id), group in df.groupby(
    ["user_id", "skill_id"]
):

    group = group.sort_values(
        "start_time"
    )

    if len(group) < 10:
        continue


    # ------------------------------------------
    # First 5 = historical behaviour
    # Next 5 = future outcome
    # ------------------------------------------

    past = group.iloc[:5]

    future = group.iloc[5:10]


    early = past.iloc[:2]

    recent = past.iloc[2:5]


    # ======================================================
    # Accuracy features
    # ======================================================

    past_accuracy = (
        past["correct"].mean()
    )

    early_accuracy = (
        early["correct"].mean()
    )

    recent_accuracy = (
        recent["correct"].mean()
    )

    improvement_rate = (
        recent_accuracy -
        early_accuracy
    )


    # ======================================================
    # Response-time features
    # ======================================================

    past_avg_time = (
        past["response_time_sec"].mean()
    )

    past_median_time = (
        past["response_time_sec"].median()
    )

    past_max_time = (
        past["response_time_sec"].max()
    )

    past_min_time = (
        past["response_time_sec"].min()
    )


    # ======================================================
    # Attempt features
    # ======================================================

    past_avg_attempts = (
        past["attempt_count"].mean()
    )

    past_total_attempts = (
        past["attempt_count"].sum()
    )

    past_max_attempts = (
        past["attempt_count"].max()
    )


    # ======================================================
    # Hint features
    # ======================================================

    past_avg_hints = (
        past["hint_count"].mean()
    )

    past_total_hints = (
        past["hint_count"].sum()
    )

    past_hint_rate = (
        past["hint_used"].mean()
    )


    # ======================================================
    # Future target
    # ======================================================

    future_accuracy = (
        future["correct"].mean()
    )


    rows.append({

        "user_id": student_id,

        "skill_id": skill_id,


        "past_accuracy": past_accuracy,

        "early_accuracy": early_accuracy,

        "recent_accuracy": recent_accuracy,

        "improvement_rate": improvement_rate,


        "past_avg_time": past_avg_time,

        "past_median_time": past_median_time,

        "past_max_time": past_max_time,

        "past_min_time": past_min_time,


        "past_avg_attempts": past_avg_attempts,

        "past_total_attempts": past_total_attempts,

        "past_max_attempts": past_max_attempts,


        "past_avg_hints": past_avg_hints,

        "past_total_hints": past_total_hints,

        "past_hint_rate": past_hint_rate,


        "future_accuracy": future_accuracy
    })


# ==========================================================
# Create dataframe
# ==========================================================

risk_df = pd.DataFrame(
    rows
)


print(
    "\nCreated ML dataset:"
)

print(
    risk_df.shape
)


print(
    "\nFuture accuracy statistics:"
)

print(
    risk_df["future_accuracy"]
    .describe()
)


# ==========================================================
# Create SAME risk labels as Junyi experiment
# ==========================================================

def create_risk_label(score):

    if score >= 0.75:
        return "Low"

    elif score >= 0.50:
        return "Medium"

    else:
        return "High"


risk_df["risk_level"] = (
    risk_df["future_accuracy"]
    .apply(
        create_risk_label
    )
)


# ==========================================================
# Distribution
# ==========================================================

print(
    "\nRisk distribution:"
)

print(
    risk_df["risk_level"]
    .value_counts()
)


print(
    "\nRisk percentages:"
)

print(
    (
        risk_df["risk_level"]
        .value_counts(
            normalize=True
        )
        * 100
    ).round(2)
)


# ==========================================================
# Save
# ==========================================================

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
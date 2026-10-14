import pandas as pd

DATA_PATH = r"C:\Users\dewmi\Downloads\archive\Log_Problem.csv"

USE_COLUMNS = [
    "timestamp_TW",
    "uuid",
    "ucid",
    "is_correct",
    "total_sec_taken",
    "total_attempt_cnt",
    "used_hint_cnt",
    "is_hint_used",
    "level"
]

print("Loading data...")

df = pd.read_csv(
    DATA_PATH,
    usecols=USE_COLUMNS,
    nrows=1000000
)

# --------------------------------------------------
# Basic preprocessing
# --------------------------------------------------

df["timestamp_TW"] = pd.to_datetime(
    df["timestamp_TW"],
    errors="coerce"
)

df["is_correct"] = df["is_correct"].astype(int)
df["is_hint_used"] = df["is_hint_used"].astype(int)

df = df.dropna(
    subset=[
        "timestamp_TW",
        "uuid",
        "ucid"
    ]
)

df = df[
    (df["total_sec_taken"] >= 0) &
    (df["total_attempt_cnt"] >= 0) &
    (df["used_hint_cnt"] >= 0)
]

df = df.sort_values(
    by=[
        "uuid",
        "ucid",
        "timestamp_TW"
    ]
)

print("Rows after cleaning:", len(df))


# --------------------------------------------------
# Count interactions for each student + skill
# --------------------------------------------------

group_counts = (
    df.groupby(["uuid", "ucid"])
      .size()
)

print(
    "\nStudent-skill pairs:",
    len(group_counts)
)

print(
    "Pairs with at least 10 interactions:",
    (group_counts >= 10).sum()
)

print(
    "Pairs with at least 20 interactions:",
    (group_counts >= 20).sum()
)


# --------------------------------------------------
# Keep pairs with at least 10 interactions
#
# Past 5 interactions
# Future 5 interactions
# --------------------------------------------------

valid_pairs = (
    group_counts[
        group_counts >= 10
    ]
    .index
)

df = (
    df.set_index(["uuid", "ucid"])
      .loc[valid_pairs]
      .reset_index()
)

print(
    "\nValid student-skill pairs:",
    len(valid_pairs)
)


# --------------------------------------------------
# Build ML dataset
# --------------------------------------------------

rows = []

for (student_id, skill_id), group in df.groupby(
    ["uuid", "ucid"]
):

    group = group.sort_values("timestamp_TW")

    if len(group) < 10:
        continue

    # First 5 = observed behaviour
    past = group.iloc[:5]

    # Next 5 = future performance
    future = group.iloc[5:10]

    # ----------------------------------------------
    # Accuracy features
    # ----------------------------------------------

    past_accuracy = (
        past["is_correct"].mean()
    )

    # First half vs later half
    early = past.iloc[:2]
    recent = past.iloc[2:5]

    early_accuracy = (
        early["is_correct"].mean()
    )

    recent_accuracy = (
        recent["is_correct"].mean()
    )

    improvement_rate = (
        recent_accuracy -
        early_accuracy
    )

    # ----------------------------------------------
    # Time features
    # ----------------------------------------------

    past_avg_time = (
        past["total_sec_taken"].mean()
    )

    past_median_time = (
        past["total_sec_taken"].median()
    )

    past_max_time = (
        past["total_sec_taken"].max()
    )

    past_min_time = (
        past["total_sec_taken"].min()
    )

    # ----------------------------------------------
    # Attempt features
    # ----------------------------------------------

    past_avg_attempts = (
        past["total_attempt_cnt"].mean()
    )

    past_total_attempts = (
        past["total_attempt_cnt"].sum()
    )

    past_max_attempts = (
        past["total_attempt_cnt"].max()
    )

    # ----------------------------------------------
    # Hint features
    # ----------------------------------------------

    past_avg_hints = (
        past["used_hint_cnt"].mean()
    )

    past_total_hints = (
        past["used_hint_cnt"].sum()
    )

    past_hint_rate = (
        past["is_hint_used"].mean()
    )

    # ----------------------------------------------
    # Level features
    # ----------------------------------------------

    past_avg_level = (
        past["level"].mean()
    )

    past_max_level = (
        past["level"].max()
    )

    past_min_level = (
        past["level"].min()
    )

    # ----------------------------------------------
    # Future target
    # ----------------------------------------------

    future_accuracy = (
        future["is_correct"].mean()
    )

    rows.append({

        "uuid": student_id,
        "ucid": skill_id,

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

        "past_avg_level": past_avg_level,

        "past_max_level": past_max_level,

        "past_min_level": past_min_level,

        "future_accuracy": future_accuracy
    })


risk_df = pd.DataFrame(rows)

print(
    "\nCreated student-skill dataset:"
)

print(
    risk_df.shape
)

print(
    "\nFuture accuracy statistics:"
)

print(
    risk_df["future_accuracy"].describe()
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
    risk_df["future_accuracy"]
    .apply(create_risk_label)
)

print(
    "\nRisk distribution:"
)

print(
    risk_df["risk_level"]
    .value_counts()
)


# --------------------------------------------------
# Save
# --------------------------------------------------

OUTPUT_PATH = (
    "ml/data_pipeline/"
    "risk_training_data.csv"
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
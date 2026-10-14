import pandas as pd

DATA_PATH = r"C:\Users\dewmi\Downloads\archive\Log_Problem.csv"

OUTPUT_PATH = "ml/data_pipeline/risk_training_data_full.csv"

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

CHUNK_SIZE = 500000

print("Reading full dataset in chunks...")

chunks = []

for i, chunk in enumerate(
    pd.read_csv(
        DATA_PATH,
        usecols=USE_COLUMNS,
        chunksize=CHUNK_SIZE
    )
):
    print(f"Processing chunk {i + 1}...")

    chunk["timestamp_TW"] = pd.to_datetime(
        chunk["timestamp_TW"],
        errors="coerce"
    )

    chunk["is_correct"] = chunk["is_correct"].astype(int)
    chunk["is_hint_used"] = chunk["is_hint_used"].astype(int)

    chunk = chunk.dropna(
        subset=[
            "timestamp_TW",
            "uuid",
            "ucid"
        ]
    )

    chunk = chunk[
        (chunk["total_sec_taken"] >= 0) &
        (chunk["total_attempt_cnt"] >= 0) &
        (chunk["used_hint_cnt"] >= 0)
    ]

    chunks.append(chunk)

print("\nCombining chunks...")

df = pd.concat(
    chunks,
    ignore_index=True
)

print("Full cleaned rows:", len(df))

# --------------------------------------------------
# Sort by student + skill + time
# --------------------------------------------------

df = df.sort_values(
    by=[
        "uuid",
        "ucid",
        "timestamp_TW"
    ]
)

# --------------------------------------------------
# Count student-skill interactions
# --------------------------------------------------

group_counts = (
    df.groupby(["uuid", "ucid"])
      .size()
)

print("\nStudent-skill pairs:")
print(len(group_counts))

print("\nPairs with at least 10 interactions:")
print((group_counts >= 10).sum())

print("\nPairs with at least 20 interactions:")
print((group_counts >= 20).sum())

# --------------------------------------------------
# Keep only valid pairs
# --------------------------------------------------

valid_pairs = group_counts[
    group_counts >= 10
].index

valid_pair_set = set(valid_pairs)

df["pair"] = list(zip(df["uuid"], df["ucid"]))

df = df[
    df["pair"].isin(valid_pair_set)
]

df = df.drop(columns=["pair"])

print("\nValid pairs:")
print(len(valid_pairs))

# --------------------------------------------------
# Build ML rows
# --------------------------------------------------

rows = []

for (student_id, skill_id), group in df.groupby(
    ["uuid", "ucid"]
):

    group = group.sort_values("timestamp_TW")

    if len(group) < 10:
        continue

    past = group.iloc[:5]
    future = group.iloc[5:10]

    early = past.iloc[:2]
    recent = past.iloc[2:5]

    past_accuracy = past["is_correct"].mean()

    early_accuracy = early["is_correct"].mean()

    recent_accuracy = recent["is_correct"].mean()

    improvement_rate = (
        recent_accuracy - early_accuracy
    )

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

    past_avg_attempts = (
        past["total_attempt_cnt"].mean()
    )

    past_total_attempts = (
        past["total_attempt_cnt"].sum()
    )

    past_max_attempts = (
        past["total_attempt_cnt"].max()
    )

    past_avg_hints = (
        past["used_hint_cnt"].mean()
    )

    past_total_hints = (
        past["used_hint_cnt"].sum()
    )

    past_hint_rate = (
        past["is_hint_used"].mean()
    )

    past_avg_level = (
        past["level"].mean()
    )

    past_max_level = (
        past["level"].max()
    )

    past_min_level = (
        past["level"].min()
    )

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

print("\nCreated training dataset:")
print(risk_df.shape)

print("\nRisk distribution:")
print(
    risk_df["risk_level"].value_counts()
)

# --------------------------------------------------
# Save
# --------------------------------------------------

risk_df.to_csv(
    OUTPUT_PATH,
    index=False
)

print("\nSaved to:")
print(OUTPUT_PATH)
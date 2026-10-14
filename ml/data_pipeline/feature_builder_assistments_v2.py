import os
import numpy as np
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = r"C:\Users\dewmi\Downloads\ASSISTments\2012-2013-data-with-predictions-4-final.csv"

OUTPUT_PATH = "ml/data_pipeline/assistments_risk_training_v2.csv"

# Minimum interactions required for each student-skill pair
MIN_INTERACTIONS = 15

# Number of future interactions used to define future performance
FUTURE_SIZE = 5

# Literature-informed / operational risk thresholds
HIGH_RISK_THRESHOLD = 0.50
LOW_RISK_THRESHOLD = 0.80


# ============================================================
# REQUIRED COLUMNS
# ============================================================

USE_COLS = [
    "user_id",
    "skill_id",
    "problem_id",
    "start_time",
    "correct",
    "hint_count",
    "bottom_hint",
    "attempt_count",
    "ms_first_response",
    "first_action",
    "Average_confidence(FRUSTRATED)",
    "Average_confidence(CONFUSED)",
    "Average_confidence(CONCENTRATING)",
    "Average_confidence(BORED)",
]


# ============================================================
# RISK LABEL FUNCTION
# ============================================================

def assign_risk(future_accuracy):
    """
    Convert future student performance into a 3-class risk level.

    High Risk   : future accuracy < 50%
    Medium Risk : future accuracy >= 50% and < 80%
    Low Risk    : future accuracy >= 80%
    """

    if future_accuracy < HIGH_RISK_THRESHOLD:
        return "High"

    elif future_accuracy < LOW_RISK_THRESHOLD:
        return "Medium"

    else:
        return "Low"


# ============================================================
# SAFE MEAN
# ============================================================

def safe_mean(series):
    if len(series) == 0:
        return 0.0

    value = series.mean()

    if pd.isna(value):
        return 0.0

    return float(value)


# ============================================================
# SAFE MEDIAN
# ============================================================

def safe_median(series):
    if len(series) == 0:
        return 0.0

    value = series.median()

    if pd.isna(value):
        return 0.0

    return float(value)


# ============================================================
# SAFE MAX
# ============================================================

def safe_max(series):
    if len(series) == 0:
        return 0.0

    value = series.max()

    if pd.isna(value):
        return 0.0

    return float(value)


# ============================================================
# SAFE MIN
# ============================================================

def safe_min(series):
    if len(series) == 0:
        return 0.0

    value = series.min()

    if pd.isna(value):
        return 0.0

    return float(value)


# ============================================================
# STREAK FUNCTIONS
# ============================================================

def calculate_correct_streak(values):
    """
    Calculate consecutive correct answers from the end
    of the past interaction sequence.
    """

    streak = 0

    for value in reversed(values):
        if value == 1:
            streak += 1
        else:
            break

    return streak


def calculate_wrong_streak(values):
    """
    Calculate consecutive wrong answers from the end
    of the past interaction sequence.
    """

    streak = 0

    for value in reversed(values):
        if value == 0:
            streak += 1
        else:
            break

    return streak


# ============================================================
# TREND FUNCTION
# ============================================================

def calculate_trend(series):
    """
    Calculate a simple linear trend.

    Positive value = increasing trend
    Negative value = decreasing trend
    """

    values = np.asarray(series, dtype=float)

    if len(values) < 2:
        return 0.0

    x = np.arange(len(values))

    try:
        slope = np.polyfit(x, values, 1)[0]
    except Exception:
        slope = 0.0

    if not np.isfinite(slope):
        return 0.0

    return float(slope)


# ============================================================
# LOAD DATA
# ============================================================

print("Loading ASSISTments dataset...")

if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(
        f"\nDataset not found:\n{DATA_PATH}\n"
    )

df = pd.read_csv(
    DATA_PATH,
    usecols=USE_COLS,
    low_memory=False
)

print("Raw rows:", len(df))


# ============================================================
# CLEAN DATA
# ============================================================

# We need skill information for student-skill risk prediction
df = df.dropna(
    subset=[
        "user_id",
        "skill_id",
        "correct",
        "start_time"
    ]
).copy()


# ------------------------------------------------------------
# Convert numeric columns
# ------------------------------------------------------------

numeric_columns = [
    "correct",
    "hint_count",
    "bottom_hint",
    "attempt_count",
    "ms_first_response",
    "first_action",
    "Average_confidence(FRUSTRATED)",
    "Average_confidence(CONFUSED)",
    "Average_confidence(CONCENTRATING)",
    "Average_confidence(BORED)",
]

for column in numeric_columns:

    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )


# ------------------------------------------------------------
# Parse time
# ------------------------------------------------------------

df["start_time"] = pd.to_datetime(
    df["start_time"],
    errors="coerce"
)

df = df.dropna(subset=["start_time"])


# ------------------------------------------------------------
# Keep binary correctness only
# ------------------------------------------------------------

df = df[df["correct"].isin([0, 1])].copy()

df["correct"] = df["correct"].astype(int)


# ------------------------------------------------------------
# Clean response time
# ------------------------------------------------------------

# Remove negative / zero response times
df = df[df["ms_first_response"] > 0].copy()

# Convert milliseconds -> seconds
df["response_time_sec"] = (
    df["ms_first_response"] / 1000.0
)


# Remove extreme response-time outliers using 99th percentile
response_time_limit = df["response_time_sec"].quantile(0.99)

print(
    "99th percentile response time:",
    round(response_time_limit, 2),
    "seconds"
)

df = df[
    df["response_time_sec"] <= response_time_limit
].copy()


# ------------------------------------------------------------
# Fill optional missing values
# ------------------------------------------------------------

fill_zero_columns = [
    "hint_count",
    "bottom_hint",
    "attempt_count",
    "first_action",
    "Average_confidence(FRUSTRATED)",
    "Average_confidence(CONFUSED)",
    "Average_confidence(CONCENTRATING)",
    "Average_confidence(BORED)",
]

for column in fill_zero_columns:
    df[column] = df[column].fillna(0)


# ------------------------------------------------------------
# Sort chronologically
# ------------------------------------------------------------

df = df.sort_values(
    by=[
        "user_id",
        "skill_id",
        "start_time"
    ]
).reset_index(drop=True)


print("Clean rows:", len(df))


# ============================================================
# FIND VALID STUDENT-SKILL PAIRS
# ============================================================

pair_counts = (
    df.groupby(
        ["user_id", "skill_id"]
    )
    .size()
)


valid_pairs = pair_counts[
    pair_counts >= MIN_INTERACTIONS
].index


print(
    "Valid student-skill pairs:",
    len(valid_pairs)
)


# ============================================================
# BUILD ML FEATURES
# ============================================================

records = []

processed = 0


for user_id, skill_id in valid_pairs:

    group = df[
        (df["user_id"] == user_id)
        &
        (df["skill_id"] == skill_id)
    ].copy()

    group = group.sort_values("start_time")

    total_interactions = len(group)

    if total_interactions < MIN_INTERACTIONS:
        continue


    # --------------------------------------------------------
    # Past / Future Split
    # --------------------------------------------------------

    past = group.iloc[:-FUTURE_SIZE]

    future = group.iloc[-FUTURE_SIZE:]


    if len(past) < 10:
        continue


    # ========================================================
    # TARGET
    # ========================================================

    future_accuracy = safe_mean(
        future["correct"]
    )

    risk_level = assign_risk(
        future_accuracy
    )


    # ========================================================
    # ACCURACY FEATURES
    # ========================================================

    past_accuracy = safe_mean(
        past["correct"]
    )


    # Early performance
    early_size = min(
        5,
        len(past)
    )

    early_accuracy = safe_mean(
        past["correct"].iloc[:early_size]
    )


    # Recent performance
    recent_size = min(
        5,
        len(past)
    )

    recent_accuracy = safe_mean(
        past["correct"].iloc[-recent_size:]
    )


    # Very recent performance
    recent3_size = min(
        3,
        len(past)
    )

    recent3_accuracy = safe_mean(
        past["correct"].iloc[-recent3_size:]
    )


    # Improvement
    improvement_rate = (
        recent_accuracy -
        early_accuracy
    )


    # Accuracy trend
    accuracy_trend = calculate_trend(
        past["correct"].values
    )


    # ========================================================
    # RESPONSE TIME FEATURES
    # ========================================================

    past_avg_time = safe_mean(
        past["response_time_sec"]
    )

    past_median_time = safe_median(
        past["response_time_sec"]
    )

    past_max_time = safe_max(
        past["response_time_sec"]
    )

    past_min_time = safe_min(
        past["response_time_sec"]
    )


    recent_avg_time = safe_mean(
        past["response_time_sec"].iloc[-recent_size:]
    )


    response_time_trend = calculate_trend(
        past["response_time_sec"].values
    )


    # ========================================================
    # ATTEMPT FEATURES
    # ========================================================

    past_avg_attempts = safe_mean(
        past["attempt_count"]
    )

    past_total_attempts = float(
        past["attempt_count"].sum()
    )

    past_max_attempts = safe_max(
        past["attempt_count"]
    )


    attempt_trend = calculate_trend(
        past["attempt_count"].values
    )


    # ========================================================
    # HINT FEATURES
    # ========================================================

    past_avg_hints = safe_mean(
        past["hint_count"]
    )

    past_total_hints = float(
        past["hint_count"].sum()
    )


    past_hint_rate = safe_mean(
        (past["hint_count"] > 0).astype(int)
    )


    bottom_hint_rate = safe_mean(
        (past["bottom_hint"] > 0).astype(int)
    )


    hint_trend = calculate_trend(
        past["hint_count"].values
    )


    # ========================================================
    # FIRST ACTION
    # ========================================================

    first_action_avg = safe_mean(
        past["first_action"]
    )


    # ========================================================
    # STREAK FEATURES
    # ========================================================

    correctness_values = (
        past["correct"]
        .astype(int)
        .tolist()
    )


    correct_streak = calculate_correct_streak(
        correctness_values
    )

    wrong_streak = calculate_wrong_streak(
        correctness_values
    )


    # ========================================================
    # AFFECT / BEHAVIOURAL FEATURES
    # ========================================================

    avg_frustrated = safe_mean(
        past[
            "Average_confidence(FRUSTRATED)"
        ]
    )

    avg_confused = safe_mean(
        past[
            "Average_confidence(CONFUSED)"
        ]
    )

    avg_concentrating = safe_mean(
        past[
            "Average_confidence(CONCENTRATING)"
        ]
    )

    avg_bored = safe_mean(
        past[
            "Average_confidence(BORED)"
        ]
    )


    # ========================================================
    # CREATE RECORD
    # ========================================================

    record = {

        # identifiers
        "user_id": user_id,
        "skill_id": skill_id,

        # accuracy
        "past_accuracy": past_accuracy,
        "early_accuracy": early_accuracy,
        "recent_accuracy": recent_accuracy,
        "recent3_accuracy": recent3_accuracy,
        "improvement_rate": improvement_rate,
        "accuracy_trend": accuracy_trend,

        # response time
        "past_avg_time": past_avg_time,
        "past_median_time": past_median_time,
        "past_max_time": past_max_time,
        "past_min_time": past_min_time,
        "recent_avg_time": recent_avg_time,
        "response_time_trend": response_time_trend,

        # attempts
        "past_avg_attempts": past_avg_attempts,
        "past_total_attempts": past_total_attempts,
        "past_max_attempts": past_max_attempts,
        "attempt_trend": attempt_trend,

        # hints
        "past_avg_hints": past_avg_hints,
        "past_total_hints": past_total_hints,
        "past_hint_rate": past_hint_rate,
        "bottom_hint_rate": bottom_hint_rate,
        "hint_trend": hint_trend,

        # first action
        "first_action_avg": first_action_avg,

        # streaks
        "correct_streak": correct_streak,
        "wrong_streak": wrong_streak,

        # affective behaviour
        "avg_frustrated": avg_frustrated,
        "avg_confused": avg_confused,
        "avg_concentrating": avg_concentrating,
        "avg_bored": avg_bored,

        # target
        "risk_level": risk_level,
        "future_accuracy": future_accuracy,
    }


    records.append(record)

    processed += 1

    if processed % 5000 == 0:
        print(
            "Processed pairs:",
            processed
        )


# ============================================================
# CREATE FINAL DATAFRAME
# ============================================================

result = pd.DataFrame(records)


print("\nCreated V2 ML dataset:")
print(result.shape)


# ============================================================
# REMOVE INVALID NUMERIC VALUES
# ============================================================

result = result.replace(
    [np.inf, -np.inf],
    np.nan
)

before_drop = len(result)

result = result.dropna()

after_drop = len(result)


print(
    "\nRows removed because of invalid values:",
    before_drop - after_drop
)


# ============================================================
# DISPLAY TARGET STATISTICS
# ============================================================

print("\n======================================")
print("THRESHOLD CONFIGURATION")
print("======================================")

print(
    f"High Risk   : future_accuracy < {HIGH_RISK_THRESHOLD:.2f}"
)

print(
    f"Medium Risk : {HIGH_RISK_THRESHOLD:.2f} <= "
    f"future_accuracy < {LOW_RISK_THRESHOLD:.2f}"
)

print(
    f"Low Risk    : future_accuracy >= {LOW_RISK_THRESHOLD:.2f}"
)


print("\nFuture accuracy:")

print(
    result["future_accuracy"].describe()
)


print("\nRisk distribution:")

risk_distribution = (
    result["risk_level"]
    .value_counts()
)

print(risk_distribution)


print("\nRisk percentages:")

risk_percentages = (
    result["risk_level"]
    .value_counts(normalize=True)
    .mul(100)
    .round(2)
)

print(risk_percentages)


# ============================================================
# EXTRA CHECK
# ============================================================

print("\nAverage future accuracy by risk class:")

print(
    result
    .groupby("risk_level")["future_accuracy"]
    .agg(
        [
            "count",
            "mean",
            "min",
            "max"
        ]
    )
    .round(4)
)


# ============================================================
# SAVE DATASET
# ============================================================

output_directory = os.path.dirname(
    OUTPUT_PATH
)

if output_directory:
    os.makedirs(
        output_directory,
        exist_ok=True
    )


result.to_csv(
    OUTPUT_PATH,
    index=False
)


print("\nSaved to:")
print(OUTPUT_PATH)

print("\nDONE.")
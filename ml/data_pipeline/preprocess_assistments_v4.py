import os
import gc
import numpy as np
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = (
    r"C:\Users\dewmi\Downloads\ASSISTments"
    r"\2012-2013-data-with-predictions-4-final.csv"
)

CLEANED_PATH = (
    "ml/data_pipeline/assististments_clean_v4.csv"
)

OUTPUT_PATH = (
    "ml/data_pipeline/assistments_risk_training_v4.csv"
)

CHUNK_SIZE = 100_000

# Sliding-window configuration
PAST_SIZE = 10
FUTURE_SIZE = 10
STEP_SIZE = 5

MIN_INTERACTIONS = PAST_SIZE + FUTURE_SIZE

# Risk definition
HIGH_RISK_THRESHOLD = 0.50


# ============================================================
# RAW COLUMNS
# ============================================================

USE_COLUMNS = [
    "user_id",
    "skill_id",
    "start_time",
    "correct",
    "attempt_count",
    "ms_first_response",
]


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def safe_mean(series):
    if len(series) == 0:
        return 0.0

    value = series.mean()

    if pd.isna(value):
        return 0.0

    return float(value)


def safe_median(series):
    if len(series) == 0:
        return 0.0

    value = series.median()

    if pd.isna(value):
        return 0.0

    return float(value)


def safe_std(series):
    if len(series) <= 1:
        return 0.0

    value = series.std(ddof=0)

    if pd.isna(value):
        return 0.0

    return float(value)


def safe_cv(series):
    """
    Coefficient of variation = std / mean.
    """

    mean_value = safe_mean(series)

    if abs(mean_value) < 1e-8:
        return 0.0

    std_value = safe_std(series)

    return float(
        std_value / mean_value
    )


def calculate_trend(series):
    """
    Linear slope over chronological values.

    Positive = increasing
    Negative = decreasing
    """

    values = np.asarray(
        series,
        dtype=float
    )

    if len(values) < 2:
        return 0.0

    x = np.arange(
        len(values)
    )

    try:
        slope = np.polyfit(
            x,
            values,
            1
        )[0]

    except Exception:
        return 0.0

    if not np.isfinite(slope):
        return 0.0

    return float(slope)


def calculate_correct_streak(values):

    streak = 0

    for value in reversed(values):

        if value == 1:
            streak += 1

        else:
            break

    return streak


def calculate_wrong_streak(values):

    streak = 0

    for value in reversed(values):

        if value == 0:
            streak += 1

        else:
            break

    return streak


def create_binary_risk_label(
    future_accuracy
):

    if future_accuracy < HIGH_RISK_THRESHOLD:
        return "High Risk"

    return "Not High Risk"


# ============================================================
# CREATE OUTPUT DIRECTORY
# ============================================================

os.makedirs(
    "ml/data_pipeline",
    exist_ok=True
)


# ============================================================
# CHECK RAW DATASET
# ============================================================

print("==========================================")
print("ASSISTMENTS V4 LOW-MEMORY PREPROCESSING")
print("==========================================")

if not os.path.exists(DATA_PATH):

    raise FileNotFoundError(
        f"\nDataset not found:\n{DATA_PATH}"
    )


print("\nDataset found:")
print(DATA_PATH)


# ============================================================
# STAGE 1
# CLEAN RAW DATA IN CHUNKS
# ============================================================

print("\n==========================================")
print("STAGE 1 - CLEAN RAW DATA")
print("==========================================")

print(
    "\nReading raw dataset in chunks of",
    CHUNK_SIZE
)


if os.path.exists(CLEANED_PATH):
    os.remove(CLEANED_PATH)


first_chunk = True

total_raw_rows = 0
total_clean_rows = 0
chunk_number = 0


reader = pd.read_csv(
    DATA_PATH,
    usecols=USE_COLUMNS,
    chunksize=CHUNK_SIZE,
    low_memory=False
)


for chunk in reader:

    chunk_number += 1

    raw_count = len(chunk)

    total_raw_rows += raw_count


    print(
        f"\nChunk {chunk_number}"
    )

    print(
        "Raw rows:",
        raw_count
    )


    # --------------------------------------------------------
    # Required values
    # --------------------------------------------------------

    chunk = chunk.dropna(
        subset=[
            "user_id",
            "skill_id",
            "start_time",
            "correct",
            "attempt_count",
            "ms_first_response",
        ]
    ).copy()


    # --------------------------------------------------------
    # Numeric conversion
    # --------------------------------------------------------

    numeric_columns = [
        "user_id",
        "skill_id",
        "correct",
        "attempt_count",
        "ms_first_response",
    ]


    for column in numeric_columns:

        chunk[column] = pd.to_numeric(
            chunk[column],
            errors="coerce"
        )


    # --------------------------------------------------------
    # Time conversion
    # --------------------------------------------------------

    chunk["start_time"] = pd.to_datetime(
        chunk["start_time"],
        errors="coerce"
    )


    chunk = chunk.dropna(
        subset=[
            "user_id",
            "skill_id",
            "start_time",
            "correct",
            "attempt_count",
            "ms_first_response",
        ]
    ).copy()


    # --------------------------------------------------------
    # Invalid values
    # --------------------------------------------------------

    chunk = chunk[
        (chunk["correct"] >= 0)
        &
        (chunk["attempt_count"] >= 0)
        &
        (chunk["ms_first_response"] > 0)
    ].copy()


    # --------------------------------------------------------
    # Binary correctness
    # --------------------------------------------------------

    chunk["correct"] = (
        chunk["correct"] == 1
    ).astype("int8")


    # --------------------------------------------------------
    # Response time -> seconds
    # --------------------------------------------------------

    chunk["response_time_sec"] = (
        chunk["ms_first_response"]
        / 1000.0
    )


    # --------------------------------------------------------
    # Memory-efficient dtypes
    # --------------------------------------------------------

    chunk["user_id"] = (
        chunk["user_id"]
        .astype("int32")
    )

    chunk["skill_id"] = (
        chunk["skill_id"]
        .astype("int32")
    )

    chunk["attempt_count"] = (
        chunk["attempt_count"]
        .astype("float32")
    )

    chunk["response_time_sec"] = (
        chunk["response_time_sec"]
        .astype("float32")
    )


    chunk = chunk.drop(
        columns=[
            "ms_first_response"
        ]
    )


    clean_count = len(chunk)

    total_clean_rows += clean_count


    print(
        "Clean rows:",
        clean_count
    )


    # --------------------------------------------------------
    # Save cleaned chunk
    # --------------------------------------------------------

    chunk.to_csv(
        CLEANED_PATH,
        mode="w" if first_chunk else "a",
        header=first_chunk,
        index=False
    )


    first_chunk = False


    del chunk

    gc.collect()


print("\n==========================================")
print("STAGE 1 COMPLETE")
print("==========================================")

print(
    "Total raw rows:",
    total_raw_rows
)

print(
    "Total clean rows:",
    total_clean_rows
)

print(
    "Cleaned dataset:",
    CLEANED_PATH
)


# ============================================================
# STAGE 2
# GLOBAL RESPONSE-TIME STATISTICS
# ============================================================

print("\n==========================================")
print("STAGE 2 - RESPONSE TIME STATISTICS")
print("==========================================")


response_parts = []


reader = pd.read_csv(
    CLEANED_PATH,
    usecols=[
        "response_time_sec"
    ],
    chunksize=CHUNK_SIZE
)


for chunk in reader:

    response_parts.append(
        chunk[
            "response_time_sec"
        ].astype("float32")
    )


all_response_times = pd.concat(
    response_parts,
    ignore_index=True
)


# 99th percentile outlier cap
response_time_cap = (
    all_response_times
    .quantile(0.99)
)

# Threshold for unusually fast responses
fast_response_threshold = (
    all_response_times
    .quantile(0.25)
)

# Threshold for unusually slow responses
long_response_threshold = (
    all_response_times
    .quantile(0.75)
)


print(
    "Fast-response threshold (25th percentile):",
    round(
        float(
            fast_response_threshold
        ),
        2
    ),
    "seconds"
)

print(
    "Long-response threshold (75th percentile):",
    round(
        float(
            long_response_threshold
        ),
        2
    ),
    "seconds"
)

print(
    "Response-time cap (99th percentile):",
    round(
        float(
            response_time_cap
        ),
        2
    ),
    "seconds"
)


del response_parts
del all_response_times

gc.collect()


# ============================================================
# STAGE 3
# LOAD CLEANED DATA
# ============================================================

print("\n==========================================")
print("STAGE 3 - LOAD CLEANED DATA")
print("==========================================")


dtype_map = {
    "user_id": "int32",
    "skill_id": "int32",
    "correct": "int8",
    "attempt_count": "float32",
    "response_time_sec": "float32",
}


df = pd.read_csv(
    CLEANED_PATH,
    dtype=dtype_map,
    parse_dates=[
        "start_time"
    ],
    low_memory=False
)


print(
    "Loaded clean rows:",
    len(df)
)


# ============================================================
# RESPONSE-TIME CAP
# ============================================================

df["response_time_sec"] = (
    df["response_time_sec"]
    .clip(
        upper=response_time_cap
    )
    .astype("float32")
)


# ============================================================
# SORT CHRONOLOGICALLY
# ============================================================

print(
    "\nSorting by student, skill and time..."
)


df = df.sort_values(
    [
        "user_id",
        "skill_id",
        "start_time"
    ]
).reset_index(
    drop=True
)


print(
    "Unique students:",
    df["user_id"].nunique()
)

print(
    "Unique skills:",
    df["skill_id"].nunique()
)


# ============================================================
# VALID PAIRS
# ============================================================

pair_counts = (
    df.groupby(
        [
            "user_id",
            "skill_id"
        ],
        sort=False
    )
    .size()
)


valid_pairs = (
    pair_counts[
        pair_counts
        >= MIN_INTERACTIONS
    ]
)


print(
    "\nPairs with at least",
    MIN_INTERACTIONS,
    "interactions:",
    len(valid_pairs)
)


# ============================================================
# STAGE 4
# V4 FEATURE ENGINEERING
# ============================================================

print("\n==========================================")
print("STAGE 4 - V4 FEATURE ENGINEERING")
print("==========================================")


records = []

processed_pairs = 0
created_windows = 0


grouped = df.groupby(
    [
        "user_id",
        "skill_id"
    ],
    sort=False
)


for (
    user_id,
    skill_id
), group in grouped:


    total_interactions = len(
        group
    )


    if total_interactions < MIN_INTERACTIONS:
        continue


    group = (
        group
        .sort_values(
            "start_time"
        )
        .reset_index(
            drop=True
        )
    )


    max_start = (
        total_interactions
        - PAST_SIZE
        - FUTURE_SIZE
    )


    for start in range(
        0,
        max_start + 1,
        STEP_SIZE
    ):


        # ----------------------------------------------------
        # Past / future windows
        # ----------------------------------------------------

        past = group.iloc[
            start:
            start + PAST_SIZE
        ]


        future = group.iloc[
            start + PAST_SIZE:
            start + PAST_SIZE + FUTURE_SIZE
        ]


        if len(past) != PAST_SIZE:
            continue

        if len(future) != FUTURE_SIZE:
            continue


        # ====================================================
        # 1. PERFORMANCE FEATURES
        # ====================================================

        past_accuracy = safe_mean(
            past["correct"]
        )


        early_accuracy = safe_mean(
            past[
                "correct"
            ].iloc[:5]
        )


        recent_accuracy = safe_mean(
            past[
                "correct"
            ].iloc[-5:]
        )


        recent3_accuracy = safe_mean(
            past[
                "correct"
            ].iloc[-3:]
        )


        improvement_rate = (
            recent_accuracy
            - early_accuracy
        )


        accuracy_trend = calculate_trend(
            past[
                "correct"
            ]
        )


        # V4: performance variability
        accuracy_std = safe_std(
            past[
                "correct"
            ]
        )


        # V4: error rate
        error_rate = safe_mean(
            1
            - past[
                "correct"
            ]
        )


        # V4:
        # difference between recent and entire past
        recent_accuracy_gap = (
            recent_accuracy
            - past_accuracy
        )


        # V4:
        # Higher value means more stable correctness
        performance_consistency = (
            1.0
            - accuracy_std
        )


        # ====================================================
        # 2. STREAK FEATURES
        # ====================================================

        correctness_values = (
            past[
                "correct"
            ]
            .astype(int)
            .tolist()
        )


        correct_streak = (
            calculate_correct_streak(
                correctness_values
            )
        )


        wrong_streak = (
            calculate_wrong_streak(
                correctness_values
            )
        )


        # ====================================================
        # 3. RESPONSE-TIME FEATURES
        # ====================================================

        past_avg_time = safe_mean(
            past[
                "response_time_sec"
            ]
        )


        past_median_time = safe_median(
            past[
                "response_time_sec"
            ]
        )


        recent_avg_time = safe_mean(
            past[
                "response_time_sec"
            ].iloc[-5:]
        )


        response_time_trend = (
            calculate_trend(
                past[
                    "response_time_sec"
                ]
            )
        )


        # V4: response-time variability
        response_time_std = safe_std(
            past[
                "response_time_sec"
            ]
        )


        # V4: normalized variability
        response_time_cv = safe_cv(
            past[
                "response_time_sec"
            ]
        )


        # V4:
        # recent time compared to overall time
        recent_time_gap = (
            recent_avg_time
            - past_avg_time
        )


        # V4:
        # percentage of past responses considered fast
        fast_response_rate = safe_mean(
            (
                past[
                    "response_time_sec"
                ]
                <= fast_response_threshold
            ).astype(int)
        )


        # V4:
        # percentage of unusually slow responses
        long_response_rate = safe_mean(
            (
                past[
                    "response_time_sec"
                ]
                >= long_response_threshold
            ).astype(int)
        )


        # ====================================================
        # 4. ATTEMPT FEATURES
        # ====================================================

        past_avg_attempts = safe_mean(
            past[
                "attempt_count"
            ]
        )


        recent_avg_attempts = safe_mean(
            past[
                "attempt_count"
            ].iloc[-5:]
        )


        attempt_trend = (
            calculate_trend(
                past[
                    "attempt_count"
                ]
            )
        )


        # V4: attempt variability
        attempt_std = safe_std(
            past[
                "attempt_count"
            ]
        )


        # V4:
        # recent effort relative to overall effort
        recent_attempt_gap = (
            recent_avg_attempts
            - past_avg_attempts
        )


        # V4:
        # rate of questions requiring >1 attempt
        multiple_attempt_rate = safe_mean(
            (
                past[
                    "attempt_count"
                ]
                > 1
            ).astype(int)
        )


        # ====================================================
        # 5. FUTURE TARGET
        # ====================================================

        future_accuracy = safe_mean(
            future[
                "correct"
            ]
        )


        binary_risk = (
            create_binary_risk_label(
                future_accuracy
            )
        )


        # ====================================================
        # CREATE RECORD
        # ====================================================

        record = {

            # -----------------------------------------------
            # Identifiers
            # -----------------------------------------------

            "user_id":
                int(user_id),

            "skill_id":
                int(skill_id),

            "window_start":
                int(start),


            # -----------------------------------------------
            # V3 performance features
            # -----------------------------------------------

            "past_accuracy":
                past_accuracy,

            "early_accuracy":
                early_accuracy,

            "recent_accuracy":
                recent_accuracy,

            "recent3_accuracy":
                recent3_accuracy,

            "improvement_rate":
                improvement_rate,

            "accuracy_trend":
                accuracy_trend,


            # -----------------------------------------------
            # V4 performance features
            # -----------------------------------------------

            "accuracy_std":
                accuracy_std,

            "error_rate":
                error_rate,

            "recent_accuracy_gap":
                recent_accuracy_gap,

            "performance_consistency":
                performance_consistency,


            # -----------------------------------------------
            # Streaks
            # -----------------------------------------------

            "correct_streak":
                correct_streak,

            "wrong_streak":
                wrong_streak,


            # -----------------------------------------------
            # V3 response-time features
            # -----------------------------------------------

            "past_avg_time":
                past_avg_time,

            "past_median_time":
                past_median_time,

            "recent_avg_time":
                recent_avg_time,

            "response_time_trend":
                response_time_trend,


            # -----------------------------------------------
            # V4 response-time features
            # -----------------------------------------------

            "response_time_std":
                response_time_std,

            "response_time_cv":
                response_time_cv,

            "recent_time_gap":
                recent_time_gap,

            "fast_response_rate":
                fast_response_rate,

            "long_response_rate":
                long_response_rate,


            # -----------------------------------------------
            # V3 attempt features
            # -----------------------------------------------

            "past_avg_attempts":
                past_avg_attempts,

            "recent_avg_attempts":
                recent_avg_attempts,

            "attempt_trend":
                attempt_trend,


            # -----------------------------------------------
            # V4 attempt features
            # -----------------------------------------------

            "attempt_std":
                attempt_std,

            "recent_attempt_gap":
                recent_attempt_gap,

            "multiple_attempt_rate":
                multiple_attempt_rate,


            # -----------------------------------------------
            # Target information
            # -----------------------------------------------

            "future_accuracy":
                future_accuracy,

            "binary_risk":
                binary_risk,
        }


        records.append(
            record
        )

        created_windows += 1


    processed_pairs += 1


    if processed_pairs % 5000 == 0:

        print(
            "Processed pairs:",
            processed_pairs,
            "| Windows:",
            created_windows
        )


# ============================================================
# FREE RAW DATAFRAME
# ============================================================

del df

gc.collect()


# ============================================================
# STAGE 5
# CREATE FINAL DATASET
# ============================================================

print("\n==========================================")
print("STAGE 5 - FINAL V4 DATASET")
print("==========================================")


result = pd.DataFrame(
    records
)


del records

gc.collect()


if result.empty:

    raise ValueError(
        "No V4 training records were created."
    )


print(
    "Dataset shape:",
    result.shape
)

print(
    "Unique students:",
    result[
        "user_id"
    ].nunique()
)

print(
    "Unique skills:",
    result[
        "skill_id"
    ].nunique()
)


# ============================================================
# INVALID VALUES
# ============================================================

result = result.replace(
    [
        np.inf,
        -np.inf
    ],
    np.nan
)


before_drop = len(
    result
)

result = result.dropna(
).copy()

after_drop = len(
    result
)


print(
    "Rows removed due to NaN/Inf:",
    before_drop
    - after_drop
)


# ============================================================
# DUPLICATE WINDOWS
# ============================================================

duplicate_count = (
    result.duplicated(
        subset=[
            "user_id",
            "skill_id",
            "window_start"
        ]
    )
    .sum()
)


print(
    "Duplicate windows:",
    duplicate_count
)


if duplicate_count > 0:

    result = (
        result.drop_duplicates(
            subset=[
                "user_id",
                "skill_id",
                "window_start"
            ]
        )
        .reset_index(
            drop=True
        )
    )


# ============================================================
# BINARY TARGET DISTRIBUTION
# ============================================================

print("\n==========================================")
print("BINARY RISK DISTRIBUTION")
print("==========================================")


risk_counts = (
    result[
        "binary_risk"
    ]
    .value_counts()
)


print(
    risk_counts
)


print(
    "\nRisk percentages:"
)


risk_percentages = (
    result[
        "binary_risk"
    ]
    .value_counts(
        normalize=True
    )
    .mul(100)
    .round(2)
)


print(
    risk_percentages
)


# ============================================================
# FUTURE PERFORMANCE CHECK
# ============================================================

print(
    "\nFuture accuracy statistics:"
)


print(
    result[
        "future_accuracy"
    ]
    .describe()
)


print(
    "\nFuture accuracy by binary class:"
)


print(
    result
    .groupby(
        "binary_risk"
    )[
        "future_accuracy"
    ]
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
# MODEL FEATURES
# ============================================================

MODEL_FEATURES = [

    # -----------------------------------------------
    # Performance
    # -----------------------------------------------

    "past_accuracy",
    "early_accuracy",
    "recent_accuracy",
    "recent3_accuracy",
    "improvement_rate",
    "accuracy_trend",

    "accuracy_std",
    "error_rate",
    "recent_accuracy_gap",
    "performance_consistency",


    # -----------------------------------------------
    # Streaks
    # -----------------------------------------------

    "correct_streak",
    "wrong_streak",


    # -----------------------------------------------
    # Response time
    # -----------------------------------------------

    "past_avg_time",
    "past_median_time",
    "recent_avg_time",
    "response_time_trend",

    "response_time_std",
    "response_time_cv",
    "recent_time_gap",
    "fast_response_rate",
    "long_response_rate",


    # -----------------------------------------------
    # Attempts
    # -----------------------------------------------

    "past_avg_attempts",
    "recent_avg_attempts",
    "attempt_trend",

    "attempt_std",
    "recent_attempt_gap",
    "multiple_attempt_rate",
]


print("\n==========================================")
print("V4 MODEL FEATURES")
print("==========================================")


for feature in MODEL_FEATURES:

    print(
        "-",
        feature
    )


print(
    "\nNumber of model features:",
    len(MODEL_FEATURES)
)


# ============================================================
# FEATURE VARIANCE CHECK
# ============================================================

print("\n==========================================")
print("FEATURE VARIANCE CHECK")
print("==========================================")


zero_variance_features = []


for feature in MODEL_FEATURES:

    unique_values = (
        result[
            feature
        ].nunique()
    )

    if unique_values <= 1:

        zero_variance_features.append(
            feature
        )


if zero_variance_features:

    print(
        "WARNING - zero variance features:"
    )

    for feature in zero_variance_features:

        print(
            "-",
            feature
        )

else:

    print(
        "No zero-variance model features found."
    )


# ============================================================
# SAVE DATASET
# ============================================================

result.to_csv(
    OUTPUT_PATH,
    index=False
)


print("\n==========================================")
print("V4 PREPROCESSING COMPLETE")
print("==========================================")


print(
    "\nSaved to:"
)

print(
    OUTPUT_PATH
)


print(
    "\nFinal dataset shape:",
    result.shape
)


print(
    "Final unique students:",
    result[
        "user_id"
    ].nunique()
)


print(
    "Number of model features:",
    len(
        MODEL_FEATURES
    )
)


print("\nDONE.")
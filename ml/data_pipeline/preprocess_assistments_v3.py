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

OUTPUT_PATH = (
    "ml/data_pipeline/assistments_risk_training_v3.csv"
)

# Temporary cleaned file
CLEANED_PATH = (
    "ml/data_pipeline/assistments_clean_v3.csv"
)

# Read the raw CSV in small chunks
CHUNK_SIZE = 100_000

# Sliding window configuration
PAST_SIZE = 10
FUTURE_SIZE = 10
STEP_SIZE = 5

MIN_INTERACTIONS = (
    PAST_SIZE + FUTURE_SIZE
)

# Risk thresholds
HIGH_RISK_THRESHOLD = 0.50
LOW_RISK_THRESHOLD = 0.80


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


def calculate_trend(series):

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


def create_risk_label(
    future_accuracy
):

    if future_accuracy < HIGH_RISK_THRESHOLD:

        return "High"

    elif future_accuracy < LOW_RISK_THRESHOLD:

        return "Medium"

    else:

        return "Low"


# ============================================================
# CREATE OUTPUT DIRECTORY
# ============================================================

output_directory = os.path.dirname(
    OUTPUT_PATH
)

if output_directory:

    os.makedirs(
        output_directory,
        exist_ok=True
    )


# ============================================================
# CHECK INPUT FILE
# ============================================================

print("==========================================")
print("ASSISTMENTS V3 LOW-MEMORY PREPROCESSING")
print("==========================================")

if not os.path.exists(DATA_PATH):

    raise FileNotFoundError(
        f"\nDataset not found:\n{DATA_PATH}\n"
    )


print("\nDataset found:")
print(DATA_PATH)


# ============================================================
# STAGE 1
# READ RAW DATASET IN CHUNKS
# CLEAN AND SAVE SMALLER FILE
# ============================================================

print("\n==========================================")
print("STAGE 1 - CLEAN RAW DATA")
print("==========================================")

print(
    "\nReading raw dataset in chunks of",
    CHUNK_SIZE
)


# Delete old cleaned file if it exists

if os.path.exists(CLEANED_PATH):

    os.remove(
        CLEANED_PATH
    )


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


    # ========================================================
    # DROP ESSENTIAL MISSING VALUES
    # ========================================================

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


    # ========================================================
    # CONVERT NUMERIC
    # ========================================================

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


    # ========================================================
    # PARSE DATETIME
    # ========================================================

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


    # ========================================================
    # FILTER INVALID VALUES
    # ========================================================

    chunk = chunk[
        (chunk["correct"] >= 0)
        &
        (chunk["attempt_count"] >= 0)
        &
        (chunk["ms_first_response"] > 0)
    ].copy()


    # ========================================================
    # BINARY CORRECTNESS
    # ========================================================

    chunk["correct"] = (
        chunk["correct"] == 1
    ).astype("int8")


    # ========================================================
    # RESPONSE TIME
    # ========================================================

    chunk["response_time_sec"] = (
        chunk["ms_first_response"]
        / 1000.0
    )


    # ========================================================
    # MEMORY-EFFICIENT DTYPES
    # ========================================================

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


    # We no longer need milliseconds

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


    # ========================================================
    # SAVE CLEAN CHUNK
    # ========================================================

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
    "Cleaned dataset saved to:"
)

print(
    CLEANED_PATH
)


# ============================================================
# STAGE 2
# FIND GLOBAL RESPONSE-TIME CAP
# ============================================================

print("\n==========================================")
print("STAGE 2 - RESPONSE TIME CAP")
print("==========================================")


response_time_parts = []


reader = pd.read_csv(
    CLEANED_PATH,
    usecols=[
        "response_time_sec"
    ],
    chunksize=CHUNK_SIZE
)


for chunk in reader:

    response_time_parts.append(
        chunk[
            "response_time_sec"
        ].astype("float32")
    )


response_times = pd.concat(
    response_time_parts,
    ignore_index=True
)


response_time_cap = (
    response_times
    .quantile(0.99)
)


print(
    "99th percentile response time:",
    round(
        float(response_time_cap),
        2
    ),
    "seconds"
)


del response_time_parts
del response_times

gc.collect()


# ============================================================
# STAGE 3
# LOAD CLEANED DATASET
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
# CAP RESPONSE TIME
# ============================================================

df[
    "response_time_sec"
] = (

    df[
        "response_time_sec"
    ]

    .clip(
        upper=response_time_cap
    )

    .astype("float32")
)


# ============================================================
# SORT
# ============================================================

print(
    "\nSorting by student, skill and time..."
)


df = df.sort_values(
    by=[
        "user_id",
        "skill_id",
        "start_time",
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
# STUDENT-SKILL COUNTS
# ============================================================

print("\nFinding valid student-skill pairs...")


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


valid_pair_count = (

    pair_counts
    [
        pair_counts >= MIN_INTERACTIONS
    ]

    .shape[0]
)


print(
    "Pairs with at least",
    MIN_INTERACTIONS,
    "interactions:",
    valid_pair_count
)


# ============================================================
# STAGE 4
# CREATE SLIDING WINDOWS
# ============================================================

print("\n==========================================")
print("STAGE 4 - FEATURE ENGINEERING")
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


    total_interactions = len(group)


    if (
        total_interactions
        <
        MIN_INTERACTIONS
    ):

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


        past_start = start

        past_end = (
            start
            + PAST_SIZE
        )


        future_start = (
            past_end
        )


        future_end = (
            future_start
            + FUTURE_SIZE
        )


        past = group.iloc[
            past_start:
            past_end
        ]


        future = group.iloc[
            future_start:
            future_end
        ]


        if len(past) != PAST_SIZE:

            continue


        if len(future) != FUTURE_SIZE:

            continue


        # ====================================================
        # PERFORMANCE FEATURES
        # ====================================================

        past_accuracy = safe_mean(
            past[
                "correct"
            ]
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


        accuracy_trend = (
            calculate_trend(
                past[
                    "correct"
                ]
            )
        )


        # ====================================================
        # STREAK FEATURES
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
        # RESPONSE TIME FEATURES
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
            ]

            .iloc[-5:]
        )


        response_time_trend = (

            calculate_trend(

                past[
                    "response_time_sec"
                ]
            )
        )


        # ====================================================
        # ATTEMPT FEATURES
        # ====================================================

        past_avg_attempts = safe_mean(

            past[
                "attempt_count"
            ]
        )


        recent_avg_attempts = safe_mean(

            past[
                "attempt_count"
            ]

            .iloc[-5:]
        )


        attempt_trend = (

            calculate_trend(

                past[
                    "attempt_count"
                ]
            )
        )


        # ====================================================
        # FUTURE TARGET
        # ====================================================

        future_accuracy = safe_mean(

            future[
                "correct"
            ]
        )


        risk_level = create_risk_label(

            future_accuracy
        )


        # ====================================================
        # RECORD
        # ====================================================

        record = {

            "user_id":
                int(user_id),

            "skill_id":
                int(skill_id),

            "window_start":
                int(start),


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


            "correct_streak":
                correct_streak,

            "wrong_streak":
                wrong_streak,


            "past_avg_time":
                past_avg_time,

            "past_median_time":
                past_median_time,

            "recent_avg_time":
                recent_avg_time,

            "response_time_trend":
                response_time_trend,


            "past_avg_attempts":
                past_avg_attempts,

            "recent_avg_attempts":
                recent_avg_attempts,

            "attempt_trend":
                attempt_trend,


            "future_accuracy":
                future_accuracy,

            "risk_level":
                risk_level,
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


# Free large raw dataframe
del df

gc.collect()


# ============================================================
# CREATE FINAL DATAFRAME
# ============================================================

print("\n==========================================")
print("STAGE 5 - FINAL DATASET")
print("==========================================")


result = pd.DataFrame(
    records
)


del records

gc.collect()


if result.empty:

    raise ValueError(
        "No training records were created."
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
# INVALID VALUE CHECK
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
# DUPLICATE CHECK
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

        result

        .drop_duplicates(
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
# FUTURE ACCURACY
# ============================================================

print("\n==========================================")
print("FUTURE ACCURACY STATISTICS")
print("==========================================")


print(

    result[
        "future_accuracy"
    ]

    .describe()
)


print(
    "\nPossible future accuracy values:"
)


print(

    sorted(

        result[
            "future_accuracy"
        ]

        .unique()
    )
)


# ============================================================
# RISK DISTRIBUTION
# ============================================================

print("\n==========================================")
print("RISK DISTRIBUTION")
print("==========================================")


risk_counts = (

    result[
        "risk_level"
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
        "risk_level"
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
# RISK VALIDATION
# ============================================================

print(
    "\nFuture accuracy by risk class:"
)


print(

    result

    .groupby(
        "risk_level"
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


print("\n==========================================")
print("MODEL FEATURES")
print("==========================================")


for feature in MODEL_FEATURES:

    print(
        "-",
        feature
    )


print(
    "\nNumber of features:",
    len(MODEL_FEATURES)
)


# ============================================================
# SAVE FINAL DATASET
# ============================================================

result.to_csv(
    OUTPUT_PATH,
    index=False
)


print("\n==========================================")
print("PREPROCESSING COMPLETE")
print("==========================================")


print(
    "\nFinal dataset saved to:"
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


print("\nDONE.")
import os
import gc
import numpy as np
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

RAW_DATA_PATH = (
    r"C:\Users\dewmi\Downloads\Junyi\Log_Problem.csv"
)

CLEANED_PATH = (
    "ml/data_pipeline/junyi_clean_binary.csv"
)

OUTPUT_PATH = (
    "ml/data_pipeline/junyi_risk_training_binary.csv"
)

PAIR_COUNT_PATH = (
    "ml/data_pipeline/junyi_pair_counts.csv"
)

FILTERED_PATH = (
    "ml/data_pipeline/junyi_filtered_binary.csv"
)

CHUNK_SIZE = 100_000

PAST_SIZE = 10
FUTURE_SIZE = 10
STEP_SIZE = 5

MIN_INTERACTIONS = (
    PAST_SIZE + FUTURE_SIZE
)

HIGH_RISK_THRESHOLD = 0.50

# If cleaned file already exists, reuse it
SKIP_CLEANING_IF_EXISTS = True


# ============================================================
# RAW COLUMNS
# ============================================================

USE_COLUMNS = [
    "timestamp_TW",
    "uuid",
    "ucid",
    "is_correct",
    "total_sec_taken",
    "total_attempt_cnt",
]


# ============================================================
# HELPERS
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
# STAGE 1 - RAW CLEANING
# ============================================================

print("==========================================")
print("JUNYI LOW-MEMORY BINARY PREPROCESSING")
print("==========================================")


if (
    SKIP_CLEANING_IF_EXISTS
    and os.path.exists(
        CLEANED_PATH
    )
):

    print(
        "\nCleaned file already exists."
    )

    print(
        "Skipping Stage 1:"
    )

    print(
        CLEANED_PATH
    )


else:

    print(
        "\n=========================================="
    )

    print(
        "STAGE 1 - CLEAN RAW DATA"
    )

    print(
        "=========================================="
    )


    if not os.path.exists(
        RAW_DATA_PATH
    ):

        raise FileNotFoundError(
            f"Raw Junyi file not found:\n"
            f"{RAW_DATA_PATH}"
        )


    if os.path.exists(
        CLEANED_PATH
    ):

        os.remove(
            CLEANED_PATH
        )


    first_chunk = True

    total_raw = 0
    total_clean = 0


    reader = pd.read_csv(
        RAW_DATA_PATH,
        usecols=USE_COLUMNS,
        chunksize=CHUNK_SIZE,
        low_memory=False
    )


    for chunk_number, chunk in enumerate(
        reader,
        start=1
    ):


        total_raw += len(
            chunk
        )


        print(
            f"\nChunk {chunk_number}"
        )


        print(
            "Raw rows:",
            len(chunk)
        )


        chunk = chunk.dropna(
            subset=USE_COLUMNS
        ).copy()


        chunk[
            "timestamp_TW"
        ] = pd.to_datetime(
            chunk[
                "timestamp_TW"
            ],
            errors="coerce"
        )


        for column in [
            "is_correct",
            "total_sec_taken",
            "total_attempt_cnt",
        ]:

            chunk[
                column
            ] = pd.to_numeric(
                chunk[
                    column
                ],
                errors="coerce"
            )


        chunk = chunk.dropna(
            subset=[
                "timestamp_TW",
                "is_correct",
                "total_sec_taken",
                "total_attempt_cnt",
            ]
        ).copy()


        chunk = chunk[
            (chunk["is_correct"] >= 0)
            &
            (chunk["is_correct"] <= 1)
            &
            (chunk["total_sec_taken"] > 0)
            &
            (chunk["total_attempt_cnt"] >= 1)
        ].copy()


        chunk = chunk.rename(
            columns={
                "uuid":
                    "user_id",

                "ucid":
                    "skill_id",

                "timestamp_TW":
                    "start_time",

                "is_correct":
                    "correct",

                "total_sec_taken":
                    "response_time_sec",

                "total_attempt_cnt":
                    "attempt_count",
            }
        )


        chunk[
            "correct"
        ] = chunk[
            "correct"
        ].astype(
            "int8"
        )


        chunk[
            "response_time_sec"
        ] = chunk[
            "response_time_sec"
        ].astype(
            "float32"
        )


        chunk[
            "attempt_count"
        ] = chunk[
            "attempt_count"
        ].astype(
            "float32"
        )


        chunk[
            "user_id"
        ] = chunk[
            "user_id"
        ].astype(
            "string"
        )


        chunk[
            "skill_id"
        ] = chunk[
            "skill_id"
        ].astype(
            "string"
        )


        total_clean += len(
            chunk
        )


        print(
            "Clean rows:",
            len(chunk)
        )


        chunk.to_csv(
            CLEANED_PATH,
            mode=(
                "w"
                if first_chunk
                else "a"
            ),
            header=first_chunk,
            index=False
        )


        first_chunk = False


        del chunk

        gc.collect()


    print(
        "\nTotal raw rows:",
        total_raw
    )


    print(
        "Total clean rows:",
        total_clean
    )


# ============================================================
# STAGE 2 - RESPONSE TIME CAP
# ============================================================

print(
    "\n=========================================="
)

print(
    "STAGE 2 - RESPONSE TIME CAP"
)

print(
    "=========================================="
)


# Use a sample of chunks to estimate percentile
time_values = []


reader = pd.read_csv(
    CLEANED_PATH,
    usecols=[
        "response_time_sec"
    ],
    chunksize=CHUNK_SIZE
)


for chunk_number, chunk in enumerate(
    reader,
    start=1
):


    values = (
        chunk[
            "response_time_sec"
        ]
        .dropna()
        .astype(
            "float32"
        )
    )


    # sample each chunk to keep RAM low
    if len(values) > 10_000:

        values = values.sample(
            n=10_000,
            random_state=42
        )


    time_values.append(
        values
    )


    if chunk_number % 50 == 0:

        print(
            "Scanned time chunks:",
            chunk_number
        )


time_sample = pd.concat(
    time_values,
    ignore_index=True
)


response_time_cap = (
    time_sample
    .quantile(
        0.99
    )
)


print(
    "Estimated 99th percentile response time:",
    round(
        float(
            response_time_cap
        ),
        2
    ),
    "seconds"
)


del time_values
del time_sample

gc.collect()


# ============================================================
# STAGE 3 - COUNT STUDENT-SKILL PAIRS IN CHUNKS
# ============================================================

print(
    "\n=========================================="
)

print(
    "STAGE 3 - COUNT STUDENT-SKILL PAIRS"
)

print(
    "=========================================="
)


pair_counter = {}


reader = pd.read_csv(
    CLEANED_PATH,
    usecols=[
        "user_id",
        "skill_id"
    ],
    dtype={
        "user_id":
            "string",

        "skill_id":
            "string",
    },
    chunksize=CHUNK_SIZE
)


for chunk_number, chunk in enumerate(
    reader,
    start=1
):


    counts = (
        chunk.groupby(
            [
                "user_id",
                "skill_id"
            ]
        )
        .size()
    )


    for pair, count in counts.items():

        pair_counter[
            pair
        ] = (
            pair_counter.get(
                pair,
                0
            )
            + int(
                count
            )
        )


    if chunk_number % 25 == 0:

        print(
            "Counted chunks:",
            chunk_number
        )


print(
    "\nTotal student-skill pairs:",
    len(
        pair_counter
    )
)


valid_pairs = {
    pair
    for pair, count
    in pair_counter.items()
    if count >= MIN_INTERACTIONS
}


print(
    "Pairs with at least",
    MIN_INTERACTIONS,
    "interactions:",
    len(
        valid_pairs
    )
)


# Save pair count report
pair_count_rows = [
    {
        "user_id":
            pair[0],

        "skill_id":
            pair[1],

        "interaction_count":
            count,
    }

    for pair, count
    in pair_counter.items()
]


pair_count_df = pd.DataFrame(
    pair_count_rows
)


pair_count_df.to_csv(
    PAIR_COUNT_PATH,
    index=False
)


print(
    "Pair-count report saved to:"
)

print(
    PAIR_COUNT_PATH
)


del pair_counter
del pair_count_rows
del pair_count_df

gc.collect()


# ============================================================
# STAGE 4 - CREATE SMALLER FILTERED FILE
# ============================================================

print(
    "\n=========================================="
)

print(
    "STAGE 4 - FILTER VALID PAIRS"
)

print(
    "=========================================="
)


if os.path.exists(
    FILTERED_PATH
):

    os.remove(
        FILTERED_PATH
    )


first_filtered_chunk = True

total_filtered_rows = 0


reader = pd.read_csv(
    CLEANED_PATH,
    dtype={
        "user_id":
            "string",

        "skill_id":
            "string",

        "correct":
            "int8",

        "response_time_sec":
            "float32",

        "attempt_count":
            "float32",
    },
    parse_dates=[
        "start_time"
    ],
    chunksize=CHUNK_SIZE,
    low_memory=False
)


for chunk_number, chunk in enumerate(
    reader,
    start=1
):


    chunk[
        "pair"
    ] = list(
        zip(
            chunk[
                "user_id"
            ],
            chunk[
                "skill_id"
            ]
        )
    )


    chunk = chunk[
        chunk[
            "pair"
        ].isin(
            valid_pairs
        )
    ].copy()


    chunk = chunk.drop(
        columns=[
            "pair"
        ]
    )


    if len(chunk) == 0:

        continue


    chunk[
        "response_time_sec"
    ] = (
        chunk[
            "response_time_sec"
        ]
        .clip(
            upper=response_time_cap
        )
    )


    total_filtered_rows += len(
        chunk
    )


    chunk.to_csv(
        FILTERED_PATH,
        mode=(
            "w"
            if first_filtered_chunk
            else "a"
        ),
        header=first_filtered_chunk,
        index=False
    )


    first_filtered_chunk = False


    if chunk_number % 25 == 0:

        print(
            "Filtered chunks:",
            chunk_number,
            "| rows:",
            total_filtered_rows
        )


    del chunk

    gc.collect()


print(
    "\nFiltered rows:",
    total_filtered_rows
)


print(
    "Filtered file saved to:"
)

print(
    FILTERED_PATH
)


# ============================================================
# STAGE 5 - LOAD ONLY FILTERED DATA
# ============================================================

print(
    "\n=========================================="
)

print(
    "STAGE 5 - LOAD FILTERED DATA"
)

print(
    "=========================================="
)


df = pd.read_csv(
    FILTERED_PATH,
    dtype={
        "user_id":
            "string",

        "skill_id":
            "string",

        "correct":
            "int8",

        "response_time_sec":
            "float32",

        "attempt_count":
            "float32",
    },
    parse_dates=[
        "start_time"
    ],
    low_memory=False
)


print(
    "Filtered dataset shape:",
    df.shape
)


print(
    "Unique students:",
    df[
        "user_id"
    ].nunique()
)


print(
    "Unique skills:",
    df[
        "skill_id"
    ].nunique()
)


# ============================================================
# SORT FILTERED DATA
# ============================================================

print(
    "\nSorting filtered data..."
)


df = df.sort_values(
    by=[
        "user_id",
        "skill_id",
        "start_time"
    ]
).reset_index(
    drop=True
)


# ============================================================
# STAGE 6 - FEATURE ENGINEERING
# ============================================================

print(
    "\n=========================================="
)

print(
    "STAGE 6 - SLIDING WINDOW FEATURE ENGINEERING"
)

print(
    "=========================================="
)


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


    total = len(
        group
    )


    if total < MIN_INTERACTIONS:

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
        total
        - PAST_SIZE
        - FUTURE_SIZE
    )


    for start in range(
        0,
        max_start + 1,
        STEP_SIZE
    ):


        past = group.iloc[
            start:
            start + PAST_SIZE
        ]


        future = group.iloc[
            start + PAST_SIZE:
            start + PAST_SIZE + FUTURE_SIZE
        ]


        if (
            len(past)
            != PAST_SIZE
        ):

            continue


        if (
            len(future)
            != FUTURE_SIZE
        ):

            continue


        # ====================================================
        # ACADEMIC
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
        # ENGAGEMENT - RESPONSE TIME
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


        # ====================================================
        # ENGAGEMENT - ATTEMPTS
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


        # ====================================================
        # FUTURE TARGET
        # ====================================================

        future_accuracy = safe_mean(
            future[
                "correct"
            ]
        )


        binary_risk = create_risk_label(
            future_accuracy
        )


        records.append({

            "user_id":
                user_id,

            "skill_id":
                skill_id,

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

            "binary_risk":
                binary_risk,
        })


        created_windows += 1


    processed_pairs += 1


    if (
        processed_pairs
        % 5000
        == 0
    ):

        print(
            "Processed pairs:",
            processed_pairs,
            "| Windows:",
            created_windows
        )


# ============================================================
# FINAL DATASET
# ============================================================

del df

gc.collect()


result = pd.DataFrame(
    records
)


del records

gc.collect()


if result.empty:

    raise ValueError(
        "No Junyi ML records were created."
    )


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


print(
    "\nRows removed due to NaN/Inf:",
    before_drop
    - len(result)
)


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
# FINAL SUMMARY
# ============================================================

print(
    "\n=========================================="
)

print(
    "FINAL JUNYI ML DATASET"
)

print(
    "=========================================="
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


print(
    "\nRisk distribution:"
)


print(
    result[
        "binary_risk"
    ].value_counts()
)


print(
    "\nRisk percentages:"
)


print(
    (
        result[
            "binary_risk"
        ]
        .value_counts(
            normalize=True
        )
        * 100
    ).round(
        2
    )
)


print(
    "\nFuture accuracy statistics:"
)


print(
    result[
        "future_accuracy"
    ].describe()
)


# ============================================================
# SAVE FINAL ML DATASET
# ============================================================

result.to_csv(
    OUTPUT_PATH,
    index=False
)


print(
    "\nSaved final ML dataset to:"
)

print(
    OUTPUT_PATH
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
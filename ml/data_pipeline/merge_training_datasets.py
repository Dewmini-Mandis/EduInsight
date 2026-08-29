import os
import pandas as pd

# =========================================================
# Paths
# =========================================================

JUNYI_PATH = "ml/data_pipeline/risk_training_data_full.csv"

ASSISTMENTS_PATH = (
    "ml/data_pipeline/assistments_risk_training_v2.csv"
)

OUTPUT_PATH = (
    "ml/data_pipeline/combined_risk_training.csv"
)


# =========================================================
# Common features
# =========================================================

COMMON_FEATURES = [
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
    "past_hint_rate"
]

TARGET = "risk_level"


# =========================================================
# Check files
# =========================================================

print("Checking files...")

print(
    "Junyi exists:",
    os.path.exists(JUNYI_PATH)
)

print(
    "ASSISTments exists:",
    os.path.exists(ASSISTMENTS_PATH)
)

if not os.path.exists(JUNYI_PATH):
    raise FileNotFoundError(
        f"Cannot find {JUNYI_PATH}"
    )

if not os.path.exists(ASSISTMENTS_PATH):
    raise FileNotFoundError(
        f"Cannot find {ASSISTMENTS_PATH}"
    )


# =========================================================
# Load
# =========================================================

print("\nLoading Junyi...")

junyi = pd.read_csv(
    JUNYI_PATH
)

print(
    "Junyi shape:",
    junyi.shape
)


print("\nLoading ASSISTments V2...")

assist = pd.read_csv(
    ASSISTMENTS_PATH
)

print(
    "ASSISTments shape:",
    assist.shape
)


# =========================================================
# Check required columns
# =========================================================

required_columns = (
    COMMON_FEATURES +
    [TARGET]
)


junyi_missing = [
    column
    for column in required_columns
    if column not in junyi.columns
]

assist_missing = [
    column
    for column in required_columns
    if column not in assist.columns
]


if junyi_missing:

    print(
        "\nMissing Junyi columns:"
    )

    print(junyi_missing)

    raise ValueError(
        "Junyi common features do not match."
    )


if assist_missing:

    print(
        "\nMissing ASSISTments columns:"
    )

    print(assist_missing)

    raise ValueError(
        "ASSISTments common features do not match."
    )


print(
    "\nAll common features found."
)


# =========================================================
# Check labels
# =========================================================

print(
    "\nJunyi risk distribution:"
)

print(
    junyi[TARGET].value_counts()
)


print(
    "\nASSISTments risk distribution:"
)

print(
    assist[TARGET].value_counts()
)


print(
    "\nJunyi classes:",
    sorted(
        junyi[TARGET]
        .dropna()
        .unique()
    )
)

print(
    "ASSISTments classes:",
    sorted(
        assist[TARGET]
        .dropna()
        .unique()
    )
)


# =========================================================
# Select common columns
# =========================================================

junyi_common = junyi[
    required_columns
].copy()

assist_common = assist[
    required_columns
].copy()


# Dataset source is useful later
junyi_common["dataset_source"] = "Junyi"

assist_common["dataset_source"] = "ASSISTments"


# =========================================================
# Combine
# =========================================================

print(
    "\nCombining datasets..."
)

combined = pd.concat(
    [
        junyi_common,
        assist_common
    ],
    ignore_index=True
)


# =========================================================
# Remove invalid rows
# =========================================================

before = len(combined)

combined = combined.dropna(
    subset=required_columns
).copy()

after = len(combined)


print(
    "Rows removed because of missing values:",
    before - after
)


# =========================================================
# Information
# =========================================================

print(
    "\n================================"
)

print(
    "COMBINED DATASET"
)

print(
    "================================"
)


print(
    "\nShape:",
    combined.shape
)


print(
    "\nDataset source distribution:"
)

print(
    combined[
        "dataset_source"
    ].value_counts()
)


print(
    "\nRisk distribution:"
)

print(
    combined[
        TARGET
    ].value_counts()
)


print(
    "\nRisk percentages:"
)

print(
    (
        combined[
            TARGET
        ]
        .value_counts(
            normalize=True
        )
        * 100
    ).round(2)
)


print(
    "\nRisk distribution by dataset:"
)

print(
    pd.crosstab(
        combined["dataset_source"],
        combined[TARGET]
    )
)


# =========================================================
# Save
# =========================================================

combined.to_csv(
    OUTPUT_PATH,
    index=False
)


print(
    "\nSaved combined dataset to:"
)

print(
    OUTPUT_PATH
)

print(
    "\nDONE."
)
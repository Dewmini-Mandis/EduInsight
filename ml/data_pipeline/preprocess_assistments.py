import pandas as pd

DATA_PATH = (
    r"C:\Users\dewmi\Downloads\ASSISTments"
    r"\2012-2013-data-with-predictions-4-final.csv"
)

USE_COLUMNS = [
    "user_id",
    "skill_id",
    "skill",
    "problem_id",
    "start_time",
    "end_time",
    "correct",
    "attempt_count",
    "hint_count",
    "ms_first_response",
    "first_action"
]

print("Loading ASSISTments dataset...")

df = pd.read_csv(
    DATA_PATH,
    usecols=USE_COLUMNS
)

print("\nRaw rows:")
print(len(df))

print("\nUnique students:")
print(df["user_id"].nunique())

print("\nRows with skill_id:")
print(df["skill_id"].notna().sum())

print("\nRows without skill_id:")
print(df["skill_id"].isna().sum())

print("\nUnique skills:")
print(df["skill_id"].nunique())

print("\nCorrect distribution:")
print(df["correct"].value_counts(dropna=False))

print("\nAttempt count statistics:")
print(df["attempt_count"].describe())

print("\nHint count statistics:")
print(df["hint_count"].describe())

print("\nFirst response time statistics:")
print(df["ms_first_response"].describe())


# ----------------------------------------
# Keep rows needed for student-skill model
# ----------------------------------------

clean_df = df.dropna(
    subset=[
        "user_id",
        "skill_id",
        "correct",
        "start_time"
    ]
).copy()


# ----------------------------------------
# Convert timestamp
# ----------------------------------------

clean_df["start_time"] = pd.to_datetime(
    clean_df["start_time"],
    errors="coerce"
)

clean_df = clean_df.dropna(
    subset=["start_time"]
)


# ----------------------------------------
# Ensure numeric values
# ----------------------------------------

numeric_columns = [
    "correct",
    "attempt_count",
    "hint_count",
    "ms_first_response"
]

for column in numeric_columns:

    clean_df[column] = pd.to_numeric(
        clean_df[column],
        errors="coerce"
    )


clean_df = clean_df.dropna(
    subset=numeric_columns
)


# ----------------------------------------
# Remove impossible negative values
# ----------------------------------------

clean_df = clean_df[
    (clean_df["attempt_count"] >= 0) &
    (clean_df["hint_count"] >= 0) &
    (clean_df["ms_first_response"] >= 0)
]


# ----------------------------------------
# Sort by student + skill + time
# ----------------------------------------

clean_df = clean_df.sort_values(
    by=[
        "user_id",
        "skill_id",
        "start_time"
    ]
)


print("\n==========================")
print("CLEAN DATA")
print("==========================")

print("\nClean rows:")
print(len(clean_df))

print("\nClean unique students:")
print(clean_df["user_id"].nunique())

print("\nClean unique skills:")
print(clean_df["skill_id"].nunique())


# ----------------------------------------
# Student-skill interaction counts
# ----------------------------------------

pair_counts = (
    clean_df
    .groupby(
        ["user_id", "skill_id"]
    )
    .size()
)


print("\nStudent-skill pairs:")
print(len(pair_counts))

print("\nPairs with >= 5 interactions:")
print(
    (pair_counts >= 5).sum()
)

print("\nPairs with >= 10 interactions:")
print(
    (pair_counts >= 10).sum()
)

print("\nPairs with >= 20 interactions:")
print(
    (pair_counts >= 20).sum()
)
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
    "is_downgrade",
    "is_upgrade",
    "level"
]

print("Reading first 100,000 rows...")

df = pd.read_csv(
    DATA_PATH,
    usecols=USE_COLUMNS,
    nrows=100000
)

print("\nDataset shape:")
print(df.shape)

print("\nData types:")
print(df.dtypes)

print("\nMissing values:")
print(df.isnull().sum())

print("\nUnique students:")
print(df["uuid"].nunique())

print("\nCorrect answer distribution:")
print(df["is_correct"].value_counts(dropna=False))

print("\nHint used distribution:")
print(df["is_hint_used"].value_counts(dropna=False))

print("\nLevel distribution:")
print(df["level"].value_counts(dropna=False).sort_index())

print("\nFirst 5 rows:")
print(df.head())
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

print("Loading data sample...")

df = pd.read_csv(
    DATA_PATH,
    usecols=USE_COLUMNS,
    nrows=500000
)

print("Raw shape:", df.shape)

# Convert timestamp
df["timestamp_TW"] = pd.to_datetime(
    df["timestamp_TW"],
    errors="coerce"
)

# Convert booleans to integers
df["is_correct"] = df["is_correct"].astype(int)
df["is_hint_used"] = df["is_hint_used"].astype(int)

# Remove invalid rows
df = df.dropna(
    subset=[
        "timestamp_TW",
        "uuid",
        "ucid"
    ]
)

# Remove impossible / extreme values
df = df[
    (df["total_sec_taken"] >= 0) &
    (df["total_attempt_cnt"] >= 0) &
    (df["used_hint_cnt"] >= 0)
]

# Sort student interactions by time
df = df.sort_values(
    by=["uuid", "timestamp_TW"]
)

print("Clean shape:", df.shape)

print("\nData types:")
print(df.dtypes)

print("\nSample:")
print(df.head())

print("\nStudents:")
print(df["uuid"].nunique())

# Count interactions per student
student_counts = df["uuid"].value_counts()

print("\nStudent interaction statistics:")
print(student_counts.describe())

print("\nStudents with at least 20 interactions:")
print((student_counts >= 20).sum())

print("\nStudents with at least 30 interactions:")
print((student_counts >= 30).sum())

print("\nStudents with at least 50 interactions:")
print((student_counts >= 50).sum())
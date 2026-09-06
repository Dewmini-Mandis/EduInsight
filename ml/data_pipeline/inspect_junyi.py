print("Shape:", df.shape)

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
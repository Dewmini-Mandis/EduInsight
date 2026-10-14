import pandas as pd
import os

DATA_PATH = r"C:\Users\dewmi\Downloads\ASSISTments\2012-2013-data-with-predictions-4-final.csv"

print("File exists:", os.path.exists(DATA_PATH))

print("\nReading first 10,000 rows...")

df = pd.read_csv(
    DATA_PATH,
    nrows=10000
)

print("\nDataset shape:")
print(df.shape)

print("\nColumns:")
print(df.columns.tolist())

print("\nData types:")
print(df.dtypes)

print("\nMissing values:")
print(df.isnull().sum())

print("\nFirst 5 rows:")
print(df.head())
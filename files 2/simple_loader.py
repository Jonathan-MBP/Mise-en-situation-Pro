#!/usr/bin/env python3
"""
Simple and robust SQLite loader.
Loads CSVs into SQLite with error checking.
"""

import sqlite3
import pandas as pd
import os

DB_FILE = "immobilier.db"
CSV_FILES = [
    'buildings.csv',
    'rental_units.csv',
    'tenants.csv',
    'leases.csv',
    'financial_transactions.csv',
    'maintenance_requests.csv',
    'incidents.csv'
]

print("=" * 70)
print("LOADING DATA INTO SQLITE")
print("=" * 70)

# Remove old database
if os.path.exists(DB_FILE):
    os.remove(DB_FILE)
    print(f"✓ Removed old {DB_FILE}")

# Connect to new database
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Load each CSV
for csv_file in CSV_FILES:
    if not os.path.exists(csv_file):
        print(f"✗ {csv_file} NOT FOUND in current directory")
        continue
    
    try:
        # Read CSV
        df = pd.read_csv(csv_file)
        
        # Get table name from filename
        table_name = csv_file.replace('.csv', '')
        
        # Write to SQLite
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        
        print(f"✓ {csv_file:40s} → {len(df):6d} rows loaded")
    
    except Exception as e:
        print(f"✗ {csv_file:40s} → ERROR: {e}")

# Commit and close
conn.commit()

# Verify tables were created
print("\n" + "=" * 70)
print("VERIFICATION")
print("=" * 70)

cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

if tables:
    print(f"✓ Database has {len(tables)} tables:")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]};")
        count = cursor.fetchone()[0]
        print(f"  - {table[0]:30s} : {count:6d} rows")
else:
    print("✗ No tables found! Database is empty.")

conn.close()

print("\n" + "=" * 70)
print(f"Database ready: {DB_FILE}")
print("=" * 70)
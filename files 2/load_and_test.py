#!/usr/bin/env python3
"""
Load generated CSVs into SQLite and test dashboard queries.
"""

import sqlite3
import pandas as pd
import os

DB_PATH = "immobilier.db"
OUTPUT_DIR = "/mnt/user-data/outputs"

# ============================================================================
# STEP 1: Create database and load CSVs
# ============================================================================
print("[1/3] Creating SQLite database and loading CSVs...")

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

tables = ['buildings', 'rental_units', 'tenants', 'leases', 
          'financial_transactions', 'maintenance_requests', 'incidents']

for table in tables:
    csv_path = f"{OUTPUT_DIR}/{table}.csv"
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        df.to_sql(table, conn, if_exists='replace', index=False)
        print(f"  ✓ {table}: {len(df)} rows loaded")

# ============================================================================
# STEP 2: Test key queries
# ============================================================================
print("\n[2/3] Running sample queries...")

# Query 1: Global financial overview (latest month)
print("\n--- GLOBAL FINANCIAL OVERVIEW (Latest Month) ---")
query1 = """
SELECT 
    STRFTIME('%Y-%m', ft.transaction_date) AS period,
    ROUND(SUM(CASE WHEN ft.type = 'Rent' THEN ft.amount ELSE 0 END), 2) AS total_rent_due,
    ROUND(SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END), 2) AS total_rent_collected,
    ROUND(100.0 * SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END) /
          NULLIF(SUM(CASE WHEN ft.type = 'Rent' THEN ft.amount ELSE 0 END), 0), 2) AS collection_rate_pct,
    ROUND(SUM(CASE WHEN ft.type IN ('Maintenance', 'Utility', 'Tax') THEN ft.amount ELSE 0 END), 2) AS operating_expenses,
    ROUND(SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END) -
          SUM(CASE WHEN ft.type IN ('Maintenance', 'Utility', 'Tax') THEN ft.amount ELSE 0 END), 2) AS net_margin
FROM financial_transactions ft
GROUP BY STRFTIME('%Y-%m', ft.transaction_date)
ORDER BY period DESC
LIMIT 1;
"""
df1 = pd.read_sql_query(query1, conn)
print(df1.to_string(index=False))

# Query 2: Current occupancy
print("\n--- CURRENT OCCUPANCY BY BUILDING ---")
query2 = """
SELECT 
    b.building_id,
    b.name AS building_name,
    COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) AS occupied_units,
    9 AS total_units,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) / 9, 2) AS occupancy_rate_pct
FROM buildings b
LEFT JOIN rental_units u ON b.building_id = u.building_id
LEFT JOIN leases l ON u.unit_id = l.unit_id
GROUP BY b.building_id, b.name
ORDER BY occupancy_rate_pct DESC
LIMIT 5;
"""
df2 = pd.read_sql_query(query2, conn)
print(df2.to_string(index=False))

# Query 3: Maintenance summary
print("\n--- MAINTENANCE SUMMARY (2024) ---")
query3 = """
SELECT 
    COUNT(*) AS total_requests,
    COUNT(CASE WHEN status = 'Completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN status = 'Open' THEN 1 END) AS open_requests,
    ROUND(AVG(CASE 
        WHEN completion_date IS NOT NULL 
        THEN CAST((julianday(completion_date) - julianday(request_date)) AS REAL)
        ELSE NULL 
    END), 1) AS avg_resolution_days,
    ROUND(SUM(cost), 2) AS total_cost
FROM maintenance_requests
WHERE STRFTIME('%Y', request_date) = '2024';
"""
df3 = pd.read_sql_query(query3, conn)
print(df3.to_string(index=False))

# Query 4: Incidents
print("\n--- INCIDENTS SUMMARY ---")
query4 = """
SELECT 
    COUNT(*) AS total_incidents,
    COUNT(CASE WHEN severity = 'Critical' THEN 1 END) AS critical,
    COUNT(CASE WHEN severity = 'High' THEN 1 END) AS high,
    ROUND(SUM(cost), 2) AS total_cost
FROM incidents;
"""
df4 = pd.read_sql_query(query4, conn)
print(df4.to_string(index=False))

conn.close()

# ============================================================================
# STEP 3: Summary
# ============================================================================
print("\n[3/3] Database ready for API queries")
print("="*70)
print(f"Database location: {DB_PATH}")
print(f"Database size: {os.path.getsize(DB_PATH) / 1024:.1f} KB")
print("="*70)
print("\nNext steps:")
print("1. Use dashboard_queries.sql with SQLite to generate views")
print("2. Wrap in FastAPI endpoints")
print("3. Connect to frontend (Chart.js, React, or Looker Studio)")

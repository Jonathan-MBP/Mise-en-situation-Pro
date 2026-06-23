#!/usr/bin/env python3
"""
Build Real Estate Property Management Database from French Government Data
- Input: French DHUP rental prediction data (pred-app-mef-dhup.csv)
- Filter: Paris (75) + Hauts-de-Seine (92)
- Output: SQLite database with realistic property management data
- Grounded in REAL market prices, synthetic structure
"""

import pandas as pd
import numpy as np
import sqlite3
from datetime import datetime, timedelta
import random

# Set seed for reproducibility
random.seed(42)
np.random.seed(42)

print("=" * 80)
print("BUILDING REAL ESTATE DATABASE FROM FRENCH GOVERNMENT DATA")
print("=" * 80)

# ============================================================================
# STEP 1: Load and filter rental price data
# ============================================================================
print("\n[1/5] Loading French government rental prediction data...")

try:
    # Read with correct encoding
    df_prices = pd.read_csv(
        'pred-app-mef-dhup.csv',
        encoding='cp1252',
        sep=';',
        dtype={'INSEE_C': str, 'DEP': str}
    )
    print(f"  ✓ Loaded {len(df_prices)} records")
    print(f"  Columns: {df_prices.columns.tolist()}")
except FileNotFoundError:
    print("  ✗ File not found: pred-app-mef-dhup.csv")
    print("  Make sure it's in the current directory")
    exit(1)

# Filter: Paris (75) + Hauts-de-Seine (92)
df_paris = df_prices[df_prices['DEP'].isin(['75', '92'])].copy()
print(f"  ✓ Filtered to Paris + Hauts-de-Seine: {len(df_paris)} communes")

# Show samples
print("\n  Sample Paris/Hauts-de-Seine rental prices:")
print(df_paris[['LIBGEO', 'DEP', 'loypredm2']].head(10).to_string(index=False))

# ============================================================================
# STEP 2: Create buildings (immeubles) from communes
# ============================================================================
print("\n[2/5] Creating realistic buildings...")

buildings = []
building_id = 1
unit_id = 1
commune_to_building = {}

for idx, row in df_paris.iterrows():
    commune_code = row['INSEE_C']
    commune_name = row['LIBGEO']
    dept = row['DEP']
    rent_per_m2 = row['loypredm2']
    
    # Replace commas with dots for float conversion
    if isinstance(rent_per_m2, str):
        rent_per_m2 = float(rent_per_m2.replace(',', '.'))
    
    # Create 1-3 buildings per commune
    num_buildings_in_commune = random.randint(1, 3)
    
    for b in range(num_buildings_in_commune):
        building = {
            'building_id': building_id,
            'name': f"Immeuble {building_id} - {commune_name}",
            'address': f"{random.randint(1, 200)} Rue de {commune_name}",
            'city': commune_name,
            'postal_code': f"{dept}{random.randint(1000, 9999)}",
            'year_built': random.randint(1960, 2020),
            'floors': random.randint(3, 8),
            'total_units': random.randint(6, 12),
            'construction_type': random.choice(['Concrete', 'Stone', 'Mixed']),
            'created_at': '2020-01-01',
            'rent_per_m2': rent_per_m2,
            'commune_code': commune_code
        }
        buildings.append(building)
        commune_to_building[building_id] = {
            'rent_per_m2': rent_per_m2,
            'commune': commune_name
        }
        building_id += 1

df_buildings = pd.DataFrame(buildings)
print(f"  ✓ Created {len(df_buildings)} buildings")
print(f"  Avg rent/m²: {df_buildings['rent_per_m2'].mean():.2f}€")
print(f"  Min rent/m²: {df_buildings['rent_per_m2'].min():.2f}€")
print(f"  Max rent/m²: {df_buildings['rent_per_m2'].max():.2f}€")

# ============================================================================
# STEP 3: Create rental units (logements) from buildings
# ============================================================================
print("\n[3/5] Creating rental units...")

rental_units = []
unit_id = 1

for idx, bldg in df_buildings.iterrows():
    building_id = bldg['building_id']
    num_units = bldg['total_units']
    rent_per_m2 = bldg['rent_per_m2']
    
    for u in range(num_units):
        floor = (u // 3) + 1
        unit_num = f"{floor}{u % 3 + 1}"
        
        # Unit type distribution
        unit_type = random.choices(
            ['Studio', 'T2', 'T3', 'T4'],
            weights=[20, 35, 30, 15],
            k=1
        )[0]
        
        # Area based on type
        area_base = {'Studio': 28, 'T2': 50, 'T3': 70, 'T4': 90}[unit_type]
        area = area_base + np.random.normal(0, 5)
        area = max(20, area)
        
        # Calculate rent from real market price
        rent_base = area * rent_per_m2
        rent = rent_base + np.random.normal(0, 50)
        rent = max(300, rent)
        
        unit = {
            'unit_id': unit_id,
            'building_id': building_id,
            'floor': floor,
            'unit_number': unit_num,
            'type': unit_type,
            'area_sqm': round(area, 2),
            'monthly_rent_base': round(rent, 2),
            'created_at': '2020-01-01'
        }
        rental_units.append(unit)
        unit_id += 1

df_units = pd.DataFrame(rental_units)
print(f"  ✓ Created {len(df_units)} rental units")
print(f"  Unit distribution: {df_units['type'].value_counts().to_dict()}")
print(f"  Avg rent: {df_units['monthly_rent_base'].mean():.2f}€/month")

# ============================================================================
# STEP 4: Create tenants, leases, and transactions
# ============================================================================
print("\n[4/5] Creating tenants, leases, and transactions...")

# Tenants
first_names = ["Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", 
               "Helen", "Ivan", "Julia", "Kevin", "Louise", "Michel", "Nina", "Oscar"]
last_names = ["Martin", "Bernard", "Thomas", "Robert", "Petit", "Durand", "Lefevre", 
              "Moreau", "Simon", "Laurent", "Lefebvre", "Michel"]

tenants = []
for tid in range(1, len(df_units) + 50):  # 50% more tenants for turnover
    tenants.append({
        'tenant_id': tid,
        'first_name': random.choice(first_names),
        'last_name': random.choice(last_names),
        'email': f"tenant{tid}@example.com",
        'phone': f"+33 {random.randint(100000000, 999999999):09d}",
        'date_of_birth': (datetime(2000, 1, 1) - timedelta(days=random.randint(7000, 20000))).date(),
        'created_at': '2020-01-01'
    })

df_tenants = pd.DataFrame(tenants)
print(f"  ✓ Created {len(df_tenants)} tenants")

# Leases (85% occupancy)
leases = []
lease_id = 1
target_occupied = int(len(df_units) * 0.85)
available_units = list(df_units['unit_id'].values)
random.shuffle(available_units)

for unit_id in available_units[:target_occupied]:
    tenant_id = random.randint(1, len(df_tenants))
    lease_start = datetime(2022, 1, 1) + timedelta(days=random.randint(0, 730))
    lease_end = lease_start + timedelta(days=random.randint(365, 1095))
    if lease_end > datetime(2024, 12, 31):
        lease_end = datetime(2024, 12, 31)
    
    unit_rent = df_units[df_units['unit_id'] == unit_id]['monthly_rent_base'].values[0]
    
    leases.append({
        'lease_id': lease_id,
        'unit_id': unit_id,
        'tenant_id': tenant_id,
        'start_date': lease_start.date(),
        'end_date': lease_end.date(),
        'monthly_rent': round(unit_rent * (1 + np.random.normal(0, 0.05)), 2),
        'deposit_amount': round(unit_rent * 2, 2),
        'status': 'Active' if lease_end >= datetime(2024, 12, 31) else 'Terminated',
        'created_at': lease_start.date()
    })
    lease_id += 1

# Historical leases
for unit_id in available_units[target_occupied:]:
    for _ in range(random.randint(1, 2)):
        tenant_id = random.randint(1, len(df_tenants))
        lease_start = datetime(2022, 1, 1) + timedelta(days=random.randint(0, 730))
        lease_end = lease_start + timedelta(days=random.randint(365, 730))
        
        if lease_end >= datetime(2022, 1, 1):
            unit_rent = df_units[df_units['unit_id'] == unit_id]['monthly_rent_base'].values[0]
            leases.append({
                'lease_id': lease_id,
                'unit_id': unit_id,
                'tenant_id': tenant_id,
                'start_date': lease_start.date(),
                'end_date': lease_end.date(),
                'monthly_rent': round(unit_rent * (1 + np.random.normal(0, 0.05)), 2),
                'deposit_amount': round(unit_rent * 2, 2),
                'status': 'Terminated',
                'created_at': lease_start.date()
            })
            lease_id += 1

df_leases = pd.DataFrame(leases)
print(f"  ✓ Created {len(df_leases)} leases ({100*target_occupied//len(df_units)}% occupancy)")

# Financial transactions
transactions = []
transaction_id = 1

# Rent transactions
for lease_id, lease_row in df_leases.iterrows():
    if pd.isna(lease_row['start_date']) or pd.isna(lease_row['end_date']):
        continue
    
    current_date = pd.to_datetime(lease_row['start_date'])
    end_date = pd.to_datetime(lease_row['end_date'])
    building_id = df_units[df_units['unit_id'] == lease_row['unit_id']]['building_id'].values[0]
    
    while current_date <= min(end_date, datetime(2024, 12, 31)):
        status = 'Paid' if random.random() > 0.05 else 'Pending'
        transactions.append({
            'transaction_id': transaction_id,
            'building_id': building_id,
            'lease_id': lease_row['lease_id'],
            'transaction_date': current_date.date(),
            'type': 'Rent',
            'amount': lease_row['monthly_rent'],
            'status': status,
            'created_at': current_date.date()
        })
        transaction_id += 1
        current_date += timedelta(days=30)

# Other expenses
for building_id in df_buildings['building_id']:
    current_date = datetime(2022, 1, 1)
    while current_date <= datetime(2024, 12, 31):
        # Utilities
        transactions.append({
            'transaction_id': transaction_id,
            'building_id': building_id,
            'lease_id': None,
            'transaction_date': current_date.date(),
            'type': 'Utility',
            'amount': round(np.random.normal(400, 100), 2),
            'status': 'Paid',
            'created_at': current_date.date()
        })
        transaction_id += 1
        
        # Tax (monthly)
        transactions.append({
            'transaction_id': transaction_id,
            'building_id': building_id,
            'lease_id': None,
            'transaction_date': current_date.date(),
            'type': 'Tax',
            'amount': round(np.random.normal(500, 150), 2),
            'status': 'Paid',
            'created_at': current_date.date()
        })
        transaction_id += 1
        
        current_date += timedelta(days=30)

df_transactions = pd.DataFrame(transactions)
print(f"  ✓ Created {len(df_transactions)} financial transactions")

# Maintenance & Incidents
maintenance = []
incidents = []
request_id = 1
incident_id = 1

categories = ["Plumbing", "Electric", "HVAC", "Structural", "Other"]
urgencies = ["Low", "Medium", "High", "Critical"]

for unit_id in df_units['unit_id']:
    num_requests = np.random.poisson(1.2)
    for _ in range(num_requests):
        request_date = datetime(2022, 1, 1) + timedelta(days=random.randint(0, 1095))
        completion_date = request_date + timedelta(days=random.randint(1, 30))
        
        maintenance.append({
            'request_id': request_id,
            'unit_id': unit_id,
            'tenant_id': random.randint(1, len(df_tenants)),
            'request_date': request_date.date(),
            'category': random.choice(categories),
            'description': f"Maintenance issue {request_id}",
            'urgency': random.choices(urgencies, weights=[40, 40, 15, 5], k=1)[0],
            'status': random.choice(['Completed', 'Completed', 'Completed', 'Open']),
            'completion_date': completion_date.date() if random.random() > 0.1 else None,
            'cost': round(np.random.gamma(2, 200), 2)
        })
        request_id += 1

for building_id in df_buildings['building_id']:
    num_incidents = np.random.poisson(1.5)
    for _ in range(num_incidents):
        incident_date = datetime(2022, 1, 1) + timedelta(days=random.randint(0, 1095))
        resolution_date = incident_date + timedelta(days=random.randint(1, 60))
        
        incidents.append({
            'incident_id': incident_id,
            'building_id': building_id,
            'incident_date': incident_date.date(),
            'type': random.choice(['Flood', 'Fire', 'Leak', 'Break_in', 'Accident']),
            'severity': random.choices(['Low', 'Medium', 'High', 'Critical'], weights=[20, 30, 35, 15], k=1)[0],
            'description': f"Incident {incident_id}",
            'status': random.choice(['Resolved', 'Resolved', 'Under_Investigation']),
            'resolution_date': resolution_date.date() if random.random() > 0.1 else None,
            'cost': round(np.random.gamma(2, 5000), 2)
        })
        incident_id += 1

df_maintenance = pd.DataFrame(maintenance)
df_incidents = pd.DataFrame(incidents)
print(f"  ✓ Created {len(df_maintenance)} maintenance requests")
print(f"  ✓ Created {len(df_incidents)} incidents")

# ============================================================================
# STEP 5: Load into SQLite
# ============================================================================
print("\n[5/5] Loading into SQLite database...")

db_path = 'immobilier_real.db'
conn = sqlite3.connect(db_path)

try:
    df_buildings.to_sql('buildings', conn, if_exists='replace', index=False)
    df_units.to_sql('rental_units', conn, if_exists='replace', index=False)
    df_tenants.to_sql('tenants', conn, if_exists='replace', index=False)
    df_leases.to_sql('leases', conn, if_exists='replace', index=False)
    df_transactions.to_sql('financial_transactions', conn, if_exists='replace', index=False)
    df_maintenance.to_sql('maintenance_requests', conn, if_exists='replace', index=False)
    df_incidents.to_sql('incidents', conn, if_exists='replace', index=False)
    conn.commit()
    print(f"  ✓ All tables loaded into SQLite: {db_path}")
except Exception as e:
    print(f"  ✗ Error loading data: {e}")
    conn.close()
    exit(1)

# Verify
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("\n" + "=" * 80)
print("DATABASE SUMMARY")
print("=" * 80)
print(f"✓ Database: {db_path}")
print(f"✓ Tables: {len(tables)}")

for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table[0]};")
    count = cursor.fetchone()[0]
    print(f"  - {table[0]:30s} : {count:6d} rows")

conn.close()

print("\n✓ Database ready for API and frontend!")
print("=" * 80)

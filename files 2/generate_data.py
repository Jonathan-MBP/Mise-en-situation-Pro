#!/usr/bin/env python3
"""
Data Generator for Gestionnaire Immobilier Dashboard
Generates 3 years of simulated data across 20 buildings.
Deterministic (seed-based) for reproducibility.
Output: CSV files ready for SQLite/PostgreSQL import.

Author: Beni MBONGO PEA (Data role)
Date: May 2026
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

# ============================================================================
# CONFIG
# ============================================================================
SEED = 42  # Deterministic seed for all randomness
NUM_BUILDINGS = 20
NUM_UNITS_PER_BUILDING = 9  # ~180 total
NUM_TENANTS = 200
START_DATE = datetime(2022, 1, 1)
END_DATE = datetime(2024, 12, 31)
OUTPUT_DIR = "/mnt/user-data/outputs"

# Set seeds
random.seed(SEED)
np.random.seed(SEED)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def random_date(start, end):
    """Generate random date between start and end."""
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))

def random_date_range(start, end, min_days=30, max_days=365):
    """Generate start and end dates for a range."""
    lease_start = random_date(start, end - timedelta(days=min_days))
    lease_end = lease_start + timedelta(days=random.randint(min_days, max_days))
    if lease_end > end:
        lease_end = end
    return lease_start, lease_end

# ============================================================================
# 1. BUILDINGS
# ============================================================================
print("[1/7] Generating buildings...")
building_data = []
cities = ["Paris", "Paris", "Paris", "Boulogne-Billancourt", "Neuilly-sur-Seine", "Levallois-Perret"]
street_names = ["Rue de", "Avenue de", "Boulevard", "Allée", "Impasse"]
qualifiers = ["la Paix", "la République", "Montmartre", "Belleville", "Marais", "Versailles", "Flandre"]

for bid in range(1, NUM_BUILDINGS + 1):
    street = f"{random.choice(street_names)} {random.choice(qualifiers)}"
    building_data.append({
        "building_id": bid,
        "name": f"Immeuble {bid}",
        "address": f"{street}, {random.choice(cities)}",
        "city": random.choice(cities),
        "postal_code": f"750{random.randint(1, 20):02d}",
        "year_built": random.randint(1970, 2020),
        "floors": random.randint(3, 8),
        "total_units": NUM_UNITS_PER_BUILDING,
        "construction_type": random.choice(["Concrete", "Stone", "Mixed"]),
        "created_at": "2020-01-01"
    })

df_buildings = pd.DataFrame(building_data)
df_buildings.to_csv(f"{OUTPUT_DIR}/buildings.csv", index=False)
print(f"  ✓ {len(df_buildings)} buildings")

# ============================================================================
# 2. RENTAL_UNITS
# ============================================================================
print("[2/7] Generating rental units...")
unit_data = []
unit_id = 1
for bid in range(1, NUM_BUILDINGS + 1):
    for i in range(NUM_UNITS_PER_BUILDING):
        floor = (i // 3) + 1
        unit_number = f"{floor}{i % 3 + 1}"
        unit_type = random.choice(["Studio", "T2", "T3", "T4"])
        area = {"Studio": 30, "T2": 55, "T3": 75, "T4": 95}[unit_type]
        area += np.random.normal(0, 5)
        rent = {"Studio": 600, "T2": 900, "T3": 1200, "T4": 1500}[unit_type]
        rent += np.random.normal(0, 100)
        
        unit_data.append({
            "unit_id": unit_id,
            "building_id": bid,
            "floor": floor,
            "unit_number": unit_number,
            "type": unit_type,
            "area_sqm": round(area, 2),
            "monthly_rent_base": round(max(400, rent), 2),
            "created_at": "2020-01-01"
        })
        unit_id += 1

df_units = pd.DataFrame(unit_data)
df_units.to_csv(f"{OUTPUT_DIR}/rental_units.csv", index=False)
print(f"  ✓ {len(df_units)} units")

# ============================================================================
# 3. TENANTS
# ============================================================================
print("[3/7] Generating tenants...")
first_names = ["Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Helen", 
               "Ivan", "Julia", "Kevin", "Louise", "Michel", "Nina", "Oscar"]
last_names = ["Martin", "Bernard", "Thomas", "Robert", "Petit", "Durand", "Lefevre", 
              "Moreau", "Simon", "Laurent", "Lefebvre", "Michel"]

tenant_data = []
for tid in range(1, NUM_TENANTS + 1):
    tenant_data.append({
        "tenant_id": tid,
        "first_name": random.choice(first_names),
        "last_name": random.choice(last_names),
        "email": f"tenant{tid}@example.com",
        "phone": f"+33 {random.randint(100000000, 999999999):09d}",
        "date_of_birth": (START_DATE - timedelta(days=random.randint(10000, 20000))).date(),
        "created_at": "2020-01-01"
    })

df_tenants = pd.DataFrame(tenant_data)
df_tenants.to_csv(f"{OUTPUT_DIR}/tenants.csv", index=False)
print(f"  ✓ {len(df_tenants)} tenants")

# ============================================================================
# 4. LEASES
# ============================================================================
print("[4/7] Generating leases...")
lease_data = []
lease_id = 1
occupied_units = set()

# 85% occupancy target
target_occupied = int(len(df_units) * 0.85)
currently_occupied = []

# Create active leases for ~85% of units
available_units = list(df_units["unit_id"].values)
random.shuffle(available_units)
for unit_id in available_units[:target_occupied]:
    tenant_id = random.randint(1, NUM_TENANTS)
    lease_start = random_date(START_DATE, datetime(2024, 1, 1))
    lease_end = lease_start + timedelta(days=random.randint(365, 1095))
    
    lease_data.append({
        "lease_id": lease_id,
        "unit_id": unit_id,
        "tenant_id": tenant_id,
        "start_date": lease_start.date(),
        "end_date": lease_end.date(),
        "monthly_rent": round(df_units[df_units["unit_id"] == unit_id]["monthly_rent_base"].values[0] * 
                            (1 + np.random.normal(0, 0.05)), 2),
        "deposit_amount": round(df_units[df_units["unit_id"] == unit_id]["monthly_rent_base"].values[0] * 2, 2),
        "status": "Active" if lease_end > END_DATE else "Terminated",
        "created_at": lease_start.date()
    })
    currently_occupied.append(unit_id)
    lease_id += 1

# Add terminated leases (history)
for unit_id in available_units[target_occupied:]:
    for _ in range(random.randint(1, 3)):  # Multiple leases per unit historically
        tenant_id = random.randint(1, NUM_TENANTS)
        lease_start, lease_end = random_date_range(START_DATE, END_DATE)
        
        if lease_end >= START_DATE:
            lease_data.append({
                "lease_id": lease_id,
                "unit_id": unit_id,
                "tenant_id": tenant_id,
                "start_date": lease_start.date(),
                "end_date": lease_end.date(),
                "monthly_rent": round(df_units[df_units["unit_id"] == unit_id]["monthly_rent_base"].values[0] * 
                                    (1 + np.random.normal(0, 0.05)), 2),
                "deposit_amount": round(df_units[df_units["unit_id"] == unit_id]["monthly_rent_base"].values[0] * 2, 2),
                "status": "Terminated",
                "created_at": lease_start.date()
            })
            lease_id += 1

df_leases = pd.DataFrame(lease_data)
df_leases.to_csv(f"{OUTPUT_DIR}/leases.csv", index=False)
print(f"  ✓ {len(df_leases)} leases (occupancy: {100*len(currently_occupied)//len(df_units)}%)")

# ============================================================================
# 5. FINANCIAL_TRANSACTIONS
# ============================================================================
print("[5/7] Generating financial transactions...")
transaction_data = []
transaction_id = 1

# Rent transactions
for lease_id, lease_row in df_leases.iterrows():
    if pd.isna(lease_row["start_date"]) or pd.isna(lease_row["end_date"]):
        continue
    
    current_date = pd.to_datetime(lease_row["start_date"])
    end_date = pd.to_datetime(lease_row["end_date"])
    
    while current_date <= min(end_date, END_DATE):
        status = "Paid" if random.random() > 0.05 else "Pending"  # 95% collected
        transaction_data.append({
            "transaction_id": transaction_id,
            "building_id": df_units[df_units["unit_id"] == lease_row["unit_id"]]["building_id"].values[0],
            "lease_id": lease_row["lease_id"],
            "transaction_date": current_date.date(),
            "type": "Rent",
            "amount": lease_row["monthly_rent"],
            "status": status,
            "created_at": current_date.date()
        })
        transaction_id += 1
        current_date += timedelta(days=30)

# Deposit transactions
for lease_id, lease_row in df_leases.iterrows():
    if lease_row["status"] == "Active":
        # Deposit in
        transaction_data.append({
            "transaction_id": transaction_id,
            "building_id": df_units[df_units["unit_id"] == lease_row["unit_id"]]["building_id"].values[0],
            "lease_id": lease_row["lease_id"],
            "transaction_date": pd.to_datetime(lease_row["start_date"]).date(),
            "type": "Deposit_In",
            "amount": lease_row["deposit_amount"],
            "status": "Paid",
            "created_at": pd.to_datetime(lease_row["start_date"]).date()
        })
        transaction_id += 1
    else:
        # Deposit out (returned after lease)
        transaction_data.append({
            "transaction_id": transaction_id,
            "building_id": df_units[df_units["unit_id"] == lease_row["unit_id"]]["building_id"].values[0],
            "lease_id": lease_row["lease_id"],
            "transaction_date": pd.to_datetime(lease_row["end_date"]).date() + timedelta(days=30),
            "type": "Deposit_Out",
            "amount": lease_row["deposit_amount"] * 0.95,  # 5% retained typically
            "status": "Paid",
            "created_at": pd.to_datetime(lease_row["end_date"]).date()
        })
        transaction_id += 1

# Utility and maintenance costs
for bid in df_buildings["building_id"]:
    current_date = START_DATE
    while current_date <= END_DATE:
        # Utilities
        transaction_data.append({
            "transaction_id": transaction_id,
            "building_id": bid,
            "lease_id": None,
            "transaction_date": current_date.date(),
            "type": "Utility",
            "amount": round(np.random.normal(500, 100), 2),
            "status": "Paid",
            "created_at": current_date.date()
        })
        transaction_id += 1
        
        # Tax
        if current_date.month == 1:
            transaction_data.append({
                "transaction_id": transaction_id,
                "building_id": bid,
                "lease_id": None,
                "transaction_date": current_date.date(),
                "type": "Tax",
                "amount": round(np.random.normal(2000, 300), 2),
                "status": "Paid",
                "created_at": current_date.date()
            })
            transaction_id += 1
        
        current_date += timedelta(days=30)

df_transactions = pd.DataFrame(transaction_data)
df_transactions.to_csv(f"{OUTPUT_DIR}/financial_transactions.csv", index=False)
print(f"  ✓ {len(df_transactions)} transactions")

# ============================================================================
# 6. MAINTENANCE_REQUESTS
# ============================================================================
print("[6/7] Generating maintenance requests...")
maintenance_data = []
request_id = 1

categories = ["Plumbing", "Electric", "HVAC", "Structural", "Other"]
urgencies = ["Low", "Medium", "High", "Critical"]

for unit_id in df_units["unit_id"]:
    # 0.5-1.5 requests per unit per year
    num_requests = np.random.poisson(1.2)
    for _ in range(num_requests):
        request_date = random_date(START_DATE, END_DATE)
        completion_date = request_date + timedelta(days=random.randint(1, 30))
        
        maintenance_data.append({
            "request_id": request_id,
            "unit_id": unit_id,
            "tenant_id": random.choice([t for t in df_tenants["tenant_id"]]),
            "request_date": request_date.date(),
            "category": random.choice(categories),
            "description": f"Maintenance issue {request_id}",
            "urgency": random.choices(urgencies, weights=[40, 40, 15, 5], k=1)[0],
            "status": random.choice(["Completed", "Completed", "Completed", "Open"]),
            "completion_date": completion_date.date() if random.random() > 0.1 else None,
            "cost": round(np.random.gamma(2, 200), 2)  # Skewed distribution, avg ~400
        })
        request_id += 1

df_maintenance = pd.DataFrame(maintenance_data)
df_maintenance.to_csv(f"{OUTPUT_DIR}/maintenance_requests.csv", index=False)
print(f"  ✓ {len(df_maintenance)} maintenance requests")

# ============================================================================
# 7. INCIDENTS
# ============================================================================
print("[7/7] Generating incidents...")
incident_data = []
incident_id = 1

incident_types = ["Flood", "Fire", "Leak", "Break_in", "Accident"]

for bid in df_buildings["building_id"]:
    # 0.5 incidents per building per year
    num_incidents = np.random.poisson(1.5)
    for _ in range(num_incidents):
        incident_date = random_date(START_DATE, END_DATE)
        resolution_date = incident_date + timedelta(days=random.randint(1, 60))
        
        incident_data.append({
            "incident_id": incident_id,
            "building_id": bid,
            "incident_date": incident_date.date(),
            "type": random.choice(incident_types),
            "severity": random.choices(["Low", "Medium", "High", "Critical"], weights=[20, 30, 35, 15], k=1)[0],
            "description": f"Incident {incident_id}",
            "status": random.choice(["Resolved", "Resolved", "Under_Investigation"]),
            "resolution_date": resolution_date.date() if random.random() > 0.1 else None,
            "cost": round(np.random.gamma(2, 5000), 2)  # High cost incidents, avg ~10k
        })
        incident_id += 1

df_incidents = pd.DataFrame(incident_data)
df_incidents.to_csv(f"{OUTPUT_DIR}/incidents.csv", index=False)
print(f"  ✓ {len(df_incidents)} incidents")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "="*70)
print("DATA GENERATION COMPLETE")
print("="*70)
print(f"buildings:              {len(df_buildings):6d} rows")
print(f"rental_units:           {len(df_units):6d} rows")
print(f"tenants:                {len(df_tenants):6d} rows")
print(f"leases:                 {len(df_leases):6d} rows")
print(f"financial_transactions: {len(df_transactions):6d} rows")
print(f"maintenance_requests:   {len(df_maintenance):6d} rows")
print(f"incidents:              {len(df_incidents):6d} rows")
print(f"{'TOTAL':30} {len(df_buildings) + len(df_units) + len(df_tenants) + len(df_leases) + len(df_transactions) + len(df_maintenance) + len(df_incidents):6d} rows")
print("="*70)
print(f"\nAll CSV files saved to: {OUTPUT_DIR}")
print("\nNext steps:")
print("1. Load these CSVs into SQLite or PostgreSQL")
print("2. Write SQL queries to compute the 3 views (financière, commerciale, opérationnelle)")
print("3. Expose via API (FastAPI) to the frontend")

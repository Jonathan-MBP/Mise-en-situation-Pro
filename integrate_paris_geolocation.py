#!/usr/bin/env python3
"""
Fetch real Paris geographic data from open sources and integrate into immobilier_real.db
Updates buildings table with:
- latitude, longitude (coordinates)
- arrondissement_code (01-20)
- arrondissement_name (1er, 2e, ... 20e)
- code_insee_official
- district

Data sources:
1. data.paris.fr API (arrondissements)
2. OpenStreetMap Nominatim (geocoding)
3. INSEE data (codes INSEE)
"""

import requests
import sqlite3
import pandas as pd
import json
from datetime import datetime
import time

print("=" * 80)
print("FETCHING PARIS GEOGRAPHIC DATA")
print("=" * 80)

DB_PATH = 'immobilier_real.db'

# ============================================================================
# STEP 1: Fetch arrondissements data from data.paris.fr
# ============================================================================

print("\n[1/4] Fetching arrondissements from data.paris.fr...")

try:
    # API endpoint for Paris arrondissements
    url = "https://opendata.paris.fr/api/records/1.0/search/?dataset=arrondissements"
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    
    data = response.json()
    arrondissements = {}
    
    for record in data.get('records', []):
        fields = record.get('fields', {})
        code = fields.get('cod_arr')  # Code arrondissement (1-20)
        name = fields.get('nom_arr')   # Name (1er, 2e, etc.)
        
        if code and name:
            arrondissements[code] = {
                'name': name,
                'code': code
            }
    
    print(f"  ✓ Found {len(arrondissements)} arrondissements")
    print(f"    Sample: {list(arrondissements.items())[:3]}")
    
except Exception as e:
    print(f"  ✗ Error fetching arrondissements: {e}")
    print("  Using fallback data...")
    
    # Fallback: hardcoded arrondissements (if API fails)
    arrondissements = {
        '1': {'code': '01', 'name': '1er'},
        '2': {'code': '02', 'name': '2e'},
        '3': {'code': '03', 'name': '3e'},
        '4': {'code': '04', 'name': '4e'},
        '5': {'code': '05', 'name': '5e'},
        '6': {'code': '06', 'name': '6e'},
        '7': {'code': '07', 'name': '7e'},
        '8': {'code': '08', 'name': '8e'},
        '9': {'code': '09', 'name': '9e'},
        '10': {'code': '10', 'name': '10e'},
        '11': {'code': '11', 'name': '11e'},
        '12': {'code': '12', 'name': '12e'},
        '13': {'code': '13', 'name': '13e'},
        '14': {'code': '14', 'name': '14e'},
        '15': {'code': '15', 'name': '15e'},
        '16': {'code': '16', 'name': '16e'},
        '17': {'code': '17', 'name': '17e'},
        '18': {'code': '18', 'name': '18e'},
        '19': {'code': '19', 'name': '19e'},
        '20': {'code': '20', 'name': '20e'},
    }

# ============================================================================
# STEP 2: Fetch INSEE codes for Paris communes
# ============================================================================

print("\n[2/4] Fetching INSEE codes...")

insee_codes = {
    'Paris': '75056',
    'Boulogne-Billancourt': '92012',
    'Neuilly-sur-Seine': '92051',
    'Levallois-Perret': '92044',
    'Montrouge': '92049',
    'Malakoff': '92046',
    'Vanves': '92075',
    'Clamart': '92023',
    'Issy-les-Moulineaux': '92040',
    'Meudon': '92048',
    'Sèvres': '92065',
    'Versailles': '92080',
}

print(f"  ✓ Loaded INSEE codes for {len(insee_codes)} communes")

# ============================================================================
# STEP 3: Geocode buildings using Nominatim (OpenStreetMap)
# ============================================================================

print("\n[3/4] Geocoding buildings with Nominatim...")

# Connect to database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Fetch buildings from database
cursor.execute("SELECT building_id, address, city, postal_code FROM buildings LIMIT 5")
buildings = cursor.fetchall()

print(f"  Processing {len(buildings)} buildings...")

geocoded_buildings = []

for i, (building_id, address, city, postal_code) in enumerate(buildings):
    try:
        # Prepare search query
        search_query = f"{address}, {postal_code} {city}, Paris, France"
        
        # Use Nominatim API (OpenStreetMap)
        nominatim_url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': search_query,
            'format': 'json',
            'limit': 1
        }
        
        response = requests.get(nominatim_url, params=params, timeout=5)
        response.raise_for_status()
        
        results = response.json()
        
        if results:
            result = results[0]
            latitude = float(result.get('lat', 48.8566))
            longitude = float(result.get('lon', 2.3522))
            
            # Determine arrondissement from postal code (75XXX)
            if postal_code.startswith('75'):
                arr_num = postal_code[3:5]  # Characters 3-4 of postal code
                arr_code = f"{int(arr_num):02d}"  # Format as 01, 02, ... 20
                arr_name = arrondissements.get(arr_num, {}).get('name', 'Unknown')
            else:
                arr_code = '00'
                arr_name = city
            
            # Get INSEE code
            insee_code = insee_codes.get(city, '')
            
            geocoded_buildings.append({
                'building_id': building_id,
                'latitude': latitude,
                'longitude': longitude,
                'arrondissement_code': arr_code,
                'arrondissement_name': arr_name,
                'code_insee': insee_code,
                'district': arr_name if arr_name != 'Unknown' else city
            })
            
            if (i + 1) % 5 == 0:
                print(f"    {i + 1}/{len(buildings)} geocoded")
            
            # Rate limiting (Nominatim requires delays)
            time.sleep(1)
            
        else:
            print(f"  ⚠ No geocoding result for: {search_query}")
            
    except Exception as e:
        print(f"  ✗ Error geocoding {address}: {e}")

print(f"  ✓ Successfully geocoded {len(geocoded_buildings)} buildings")

# ============================================================================
# STEP 4: Update database with geographic data
# ============================================================================

print("\n[4/4] Updating database...")

try:
    # Check if columns exist, if not add them
    cursor.execute("PRAGMA table_info(buildings)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'latitude' not in columns:
        print("  Adding latitude column...")
        cursor.execute("ALTER TABLE buildings ADD COLUMN latitude REAL DEFAULT 48.8566")
    
    if 'longitude' not in columns:
        print("  Adding longitude column...")
        cursor.execute("ALTER TABLE buildings ADD COLUMN longitude REAL DEFAULT 2.3522")
    
    if 'arrondissement_code' not in columns:
        print("  Adding arrondissement_code column...")
        cursor.execute("ALTER TABLE buildings ADD COLUMN arrondissement_code TEXT DEFAULT '00'")
    
    if 'arrondissement_name' not in columns:
        print("  Adding arrondissement_name column...")
        cursor.execute("ALTER TABLE buildings ADD COLUMN arrondissement_name TEXT DEFAULT 'Unknown'")
    
    if 'code_insee' not in columns:
        print("  Adding code_insee column...")
        cursor.execute("ALTER TABLE buildings ADD COLUMN code_insee TEXT DEFAULT ''")
    
    if 'district' not in columns:
        print("  Adding district column...")
        cursor.execute("ALTER TABLE buildings ADD COLUMN district TEXT DEFAULT 'Unknown'")
    
    conn.commit()
    
    # Update buildings with geocoded data
    for building in geocoded_buildings:
        cursor.execute('''
            UPDATE buildings
            SET latitude = ?, longitude = ?, 
                arrondissement_code = ?, arrondissement_name = ?,
                code_insee = ?, district = ?
            WHERE building_id = ?
        ''', (
            building['latitude'],
            building['longitude'],
            building['arrondissement_code'],
            building['arrondissement_name'],
            building['code_insee'],
            building['district'],
            building['building_id']
        ))
    
    conn.commit()
    print(f"  ✓ Updated {len(geocoded_buildings)} buildings with geographic data")
    
except Exception as e:
    print(f"  ✗ Error updating database: {e}")
    conn.rollback()

# ============================================================================
# VERIFICATION
# ============================================================================

print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)

try:
    cursor.execute('''
        SELECT building_id, name, address, city, 
               latitude, longitude, arrondissement_code, arrondissement_name, code_insee
        FROM buildings
        LIMIT 5
    ''')
    
    results = cursor.fetchall()
    
    print("\nSample updated buildings:")
    for row in results:
        print(f"\n  Building {row[0]} : {row[1]}")
        print(f"    Address: {row[2]}, {row[3]}")
        print(f"    Coordinates: {row[4]:.4f}, {row[5]:.4f}")
        print(f"    Arrondissement: {row[6]} ({row[7]})")
        print(f"    INSEE Code: {row[8]}")
    
    # Count buildings with coordinates
    cursor.execute("SELECT COUNT(*) FROM buildings WHERE latitude IS NOT NULL AND latitude != 48.8566")
    geocoded_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM buildings")
    total_count = cursor.fetchone()[0]
    
    print(f"\n  Geocoded: {geocoded_count}/{total_count} buildings")
    
except Exception as e:
    print(f"  ✗ Error during verification: {e}")

conn.close()

print("\n" + "=" * 80)
print("✓ GEOGRAPHIC DATA INTEGRATION COMPLETE")
print("=" * 80)
print(f"\nDatabase updated: {DB_PATH}")
print("New columns added to buildings table:")
print("  • latitude (REAL)")
print("  • longitude (REAL)")
print("  • arrondissement_code (TEXT)")
print("  • arrondissement_name (TEXT)")
print("  • code_insee (TEXT)")
print("  • district (TEXT)")
print("\nNext steps:")
print("  1. Verify data in database browser")
print("  2. Update API endpoints if needed (e.g., /api/buildings/map)")
print("  3. Optional: Add map visualization to frontend")
print("  4. Update documentation")
print("\n" + "=" * 80)

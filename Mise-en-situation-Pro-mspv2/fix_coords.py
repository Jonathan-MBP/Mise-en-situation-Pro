import sqlite3
import random

db_path = 'immobilier_real.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if columns exist, if not add them
cursor.execute("PRAGMA table_info(buildings)")
columns = [col[1] for col in cursor.fetchall()]

if 'latitude' not in columns:
    cursor.execute("ALTER TABLE buildings ADD COLUMN latitude REAL DEFAULT 48.8566")
if 'longitude' not in columns:
    cursor.execute("ALTER TABLE buildings ADD COLUMN longitude REAL DEFAULT 2.3522")
if 'arrondissement_code' not in columns:
    cursor.execute("ALTER TABLE buildings ADD COLUMN arrondissement_code TEXT DEFAULT '00'")
if 'arrondissement_name' not in columns:
    cursor.execute("ALTER TABLE buildings ADD COLUMN arrondissement_name TEXT DEFAULT 'Unknown'")
if 'code_insee' not in columns:
    cursor.execute("ALTER TABLE buildings ADD COLUMN code_insee TEXT DEFAULT ''")
if 'district' not in columns:
    cursor.execute("ALTER TABLE buildings ADD COLUMN district TEXT DEFAULT 'Unknown'")

conn.commit()

# Update buildings with random Paris coordinates
cursor.execute("SELECT building_id FROM buildings")
buildings = cursor.fetchall()

for b in buildings:
    building_id = b[0]
    lat = random.uniform(48.82, 48.90)
    lon = random.uniform(2.25, 2.40)
    arr_code = f"{random.randint(1, 20):02d}"
    arr_name = f"{int(arr_code)}e" if int(arr_code) > 1 else "1er"
    
    cursor.execute('''
        UPDATE buildings
        SET latitude = ?, longitude = ?, arrondissement_code = ?, arrondissement_name = ?
        WHERE building_id = ?
    ''', (lat, lon, arr_code, arr_name, building_id))

conn.commit()
print(f"Updated {len(buildings)} buildings with random Paris coordinates.")
conn.close()

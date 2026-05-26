import sqlite3
import pandas as pd

conn = sqlite3.connect('immobilier.db')

# Read all CSVs and load into SQLite
for table_name in ['buildings', 'rental_units', 'tenants', 'leases', 
                   'financial_transactions', 'maintenance_requests', 'incidents']:
    df = pd.read_csv(f'{table_name}.csv')
    df.to_sql(table_name, conn, if_exists='replace', index=False)
    print(f"✓ {table_name} loaded")

conn.commit()
conn.close()
print("Done. immobilier.db is ready.")
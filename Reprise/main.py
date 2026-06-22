#!/usr/bin/env python3
"""
FastAPI Backend with Buildings Map Endpoint
Updated main.py with new /api/buildings/map endpoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sqlite3
import pandas as pd
from datetime import datetime, timedelta
import json

app = FastAPI(title="Dashboard Dirigeants API", version="2.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "immobilier_real.db"

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ============================================================================
# ROOT & HEALTH
# ============================================================================

@app.get("/")
def root():
    """List all available endpoints"""
    endpoints = {
        "health": "/health",
        "global": {
            "summary": "/api/global/summary",
            "revenue_expense": "/api/global/revenue-expense",
            "incident_distribution": "/api/global/incident-distribution"
        },
        "financial": {
            "monthly_summary": "/api/financial/monthly-summary",
            "cost_structure": "/api/financial/cost-structure",
            "deposits": "/api/financial/deposits"
        },
        "commercial": {
            "occupancy_by_building": "/api/commercial/occupancy-by-building",
            "occupancy_trend": "/api/commercial/occupancy-trend",
            "lease_expirations": "/api/commercial/lease-expirations",
            "turnover_rate": "/api/commercial/turnover-rate"
        },
        "operational": {
            "maintenance_summary": "/api/operational/maintenance-summary",
            "open_requests": "/api/operational/open-requests",
            "resolution_time_trend": "/api/operational/resolution-time-trend",
            "requests_by_category": "/api/operational/requests-by-category",
            "incidents_summary": "/api/operational/incidents-summary"
        },
        "map": {
            "buildings_map": "/api/buildings/map"
        },
        "database": {
            "stats": "/api/database/stats"
        }
    }
    return endpoints

@app.get("/health")
def health():
    """Health check"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM buildings")
        count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": f"Connected (buildings: {count})"
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}, 500

# ============================================================================
# MAP ENDPOINT — NEW
# ============================================================================

@app.get("/api/buildings/map")
def buildings_map():
    """
    Get all buildings with geographic coordinates for map display
    
    Returns:
    {
      "data": [
        {
          "building_id": 1,
          "name": "Immeuble 1",
          "address": "123 Rue de Paris",
          "city": "Paris",
          "postal_code": "75001",
          "latitude": 48.8623,
          "longitude": 2.3522,
          "arrondissement_code": "01",
          "arrondissement_name": "1er",
          "total_units": 5,
          "occupied_units": 4,
          "occupancy_rate": 80.0,
          "monthly_rent": 3500.00
        },
        ...
      ],
      "bounds": {
        "north": 48.9022,
        "south": 48.8155,
        "east": 2.4699,
        "west": 2.2257
      },
      "count": 50
    }
    """
    try:
        conn = get_db()
        
        # Get building data with occupancy
        query = '''
        SELECT 
            b.building_id,
            b.name,
            b.address,
            b.city,
            b.postal_code,
            COALESCE(b.latitude, 48.8566) as latitude,
            COALESCE(b.longitude, 2.3522) as longitude,
            COALESCE(b.arrondissement_code, '00') as arrondissement_code,
            COALESCE(b.arrondissement_name, 'Unknown') as arrondissement_name,
            b.total_units,
            COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) as occupied_units,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) / b.total_units, 1) as occupancy_rate,
            ROUND(AVG(l.monthly_rent), 2) as monthly_rent
        FROM buildings b
        LEFT JOIN rental_units ru ON b.building_id = ru.building_id
        LEFT JOIN leases l ON ru.unit_id = l.unit_id
        GROUP BY b.building_id, b.name, b.address, b.city, b.postal_code, b.latitude, b.longitude,
                 b.arrondissement_code, b.arrondissement_name, b.total_units
        ORDER BY b.building_id
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        # Convert to list of dicts
        buildings = df.to_dict(orient='records')
        
        # Calculate bounds (for auto-zoom map)
        if buildings:
            lats = [b['latitude'] for b in buildings]
            lons = [b['longitude'] for b in buildings]
            
            bounds = {
                'north': max(lats),
                'south': min(lats),
                'east': max(lons),
                'west': min(lons)
            }
        else:
            bounds = {
                'north': 48.8566,
                'south': 48.8566,
                'east': 2.3522,
                'west': 2.3522
            }
        
        return {
            "data": buildings,
            "bounds": bounds,
            "count": len(buildings)
        }
        
    except Exception as e:
        return {"error": str(e)}, 500

# ============================================================================
# GLOBAL ENDPOINTS
# ============================================================================

@app.get("/api/global/summary")
def global_summary():
    """Global KPIs summary"""
    try:
        conn = get_db()
        
        # Revenue
        revenue_query = '''
        SELECT SUM(amount) as total
        FROM financial_transactions
        WHERE type = 'Rent' AND status = 'Paid'
        '''
        revenue = pd.read_sql_query(revenue_query, conn).iloc[0]['total'] or 0
        
        # Occupancy
        occupancy_query = '''
        SELECT 
            COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) as occupied,
            COUNT(DISTINCT ru.unit_id) as total
        FROM rental_units ru
        LEFT JOIN leases l ON ru.unit_id = l.unit_id
        '''
        occ_result = pd.read_sql_query(occupancy_query, conn).iloc[0]
        occupancy_rate = 100 * (occ_result['occupied'] / occ_result['total']) if occ_result['total'] > 0 else 0
        
        # Open maintenance requests
        open_requests_query = '''
        SELECT COUNT(*) as count FROM maintenance_requests WHERE status = 'Open'
        '''
        open_requests = pd.read_sql_query(open_requests_query, conn).iloc[0]['count']
        
        # Critical incidents
        critical_incidents_query = '''
        SELECT COUNT(*) as count FROM incidents WHERE severity = 'Critical'
        '''
        critical_incidents = pd.read_sql_query(critical_incidents_query, conn).iloc[0]['count']
        
        conn.close()
        
        return {
            "data": {
                "annual_revenue": round(revenue, 2),
                "occupancy_rate": round(occupancy_rate, 1),
                "open_requests": int(open_requests),
                "critical_incidents": int(critical_incidents)
            }
        }
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/global/revenue-expense")
def global_revenue_expense():
    """Monthly revenue vs expenses"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            strftime('%Y-%m', transaction_date) as period,
            SUM(CASE WHEN type = 'Rent' THEN amount ELSE 0 END) as revenue,
            SUM(CASE WHEN type IN ('Maintenance', 'Utility', 'Tax') THEN amount ELSE 0 END) as expenses
        FROM financial_transactions
        GROUP BY strftime('%Y-%m', transaction_date)
        ORDER BY period DESC
        LIMIT 12
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/global/incident-distribution")
def global_incident_distribution():
    """Incident breakdown by type"""
    try:
        conn = get_db()
        
        query = '''
        SELECT type, severity, COUNT(*) as count
        FROM incidents
        GROUP BY type, severity
        ORDER BY count DESC
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

# ============================================================================
# FINANCIAL ENDPOINTS
# ============================================================================

@app.get("/api/financial/monthly-summary")
def financial_monthly_summary():
    """Monthly financial summary"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            strftime('%Y-%m', transaction_date) as period,
            SUM(CASE WHEN type = 'Rent' THEN amount ELSE 0 END) as rent_due,
            SUM(CASE WHEN type = 'Rent' AND status = 'Paid' THEN amount ELSE 0 END) as rent_collected,
            ROUND(100.0 * SUM(CASE WHEN type = 'Rent' AND status = 'Paid' THEN amount ELSE 0 END) / 
                  NULLIF(SUM(CASE WHEN type = 'Rent' THEN amount ELSE 0 END), 0), 1) as collection_rate,
            SUM(CASE WHEN type IN ('Maintenance', 'Utility', 'Tax') THEN amount ELSE 0 END) as operating_expenses,
            ROUND(SUM(CASE WHEN type = 'Rent' AND status = 'Paid' THEN amount ELSE 0 END) - 
                  SUM(CASE WHEN type IN ('Maintenance', 'Utility', 'Tax') THEN amount ELSE 0 END), 2) as net_margin
        FROM financial_transactions
        GROUP BY strftime('%Y-%m', transaction_date)
        ORDER BY period DESC
        LIMIT 12
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/financial/cost-structure")
def financial_cost_structure():
    """Cost breakdown"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            type,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
        FROM financial_transactions
        WHERE type IN ('Maintenance', 'Utility', 'Tax')
        GROUP BY type
        ORDER BY total_amount DESC
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/financial/deposits")
def financial_deposits():
    """Deposits held"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            COUNT(*) as total_deposits,
            SUM(deposit_amount) as total_held,
            AVG(deposit_amount) as average_deposit,
            MIN(deposit_amount) as min_deposit,
            MAX(deposit_amount) as max_deposit
        FROM leases
        WHERE status = 'Active'
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')[0]}
    except Exception as e:
        return {"error": str(e)}, 500

# ============================================================================
# COMMERCIAL ENDPOINTS
# ============================================================================

@app.get("/api/commercial/occupancy-by-building")
def commercial_occupancy_by_building():
    """Occupancy by building"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            b.building_id,
            b.name as building_name,
            b.city,
            COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) as occupied_units,
            b.total_units,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) / 
                  NULLIF(b.total_units, 0), 1) as occupancy_rate
        FROM buildings b
        LEFT JOIN rental_units ru ON b.building_id = ru.building_id
        LEFT JOIN leases l ON ru.unit_id = l.unit_id
        GROUP BY b.building_id, b.name, b.city, b.total_units
        ORDER BY occupancy_rate DESC
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/commercial/occupancy-trend")
def commercial_occupancy_trend():
    """Occupancy trend over time"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            strftime('%Y-%m', l.start_date) as period,
            COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) as occupied,
            COUNT(DISTINCT l.lease_id) as total_leases
        FROM leases l
        GROUP BY strftime('%Y-%m', l.start_date)
        ORDER BY period DESC
        LIMIT 6
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/commercial/lease-expirations")
def commercial_lease_expirations():
    """Upcoming lease expirations"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            COUNT(*) as expirations,
            CASE 
                WHEN strftime('%Y-%q', end_date) = strftime('%Y-%q', 'now') THEN 'Q1'
                WHEN strftime('%Y-%q', end_date) = strftime('%Y-%q', 'now', '+3 months') THEN 'Q2'
                WHEN strftime('%Y-%q', end_date) = strftime('%Y-%q', 'now', '+6 months') THEN 'Q3'
                ELSE 'Q4+'
            END as quarter
        FROM leases
        WHERE status = 'Active' AND end_date > 'now'
        GROUP BY quarter
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/commercial/turnover-rate")
def commercial_turnover_rate():
    """Tenant turnover rate"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            COUNT(DISTINCT CASE WHEN status = 'Terminated' THEN lease_id END) as terminations,
            COUNT(DISTINCT CASE WHEN status = 'Active' THEN lease_id END) as active_leases,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN status = 'Terminated' THEN lease_id END) / 
                  NULLIF(COUNT(DISTINCT lease_id), 0), 1) as turnover_rate
        FROM leases
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')[0]}
    except Exception as e:
        return {"error": str(e)}, 500

# ============================================================================
# OPERATIONAL ENDPOINTS
# ============================================================================

@app.get("/api/operational/maintenance-summary")
def operational_maintenance_summary():
    """Maintenance summary"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_requests,
            COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_requests,
            ROUND(AVG(CASE WHEN completion_date IS NOT NULL 
                THEN julianday(completion_date) - julianday(request_date) 
                ELSE NULL END), 1) as avg_resolution_days,
            ROUND(AVG(cost), 2) as avg_cost
        FROM maintenance_requests
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')[0]}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/operational/open-requests")
def operational_open_requests():
    """List of open maintenance requests"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            mr.request_id,
            mr.category,
            mr.description,
            mr.urgency,
            mr.request_date,
            mr.cost,
            ru.unit_id,
            b.name as building_name
        FROM maintenance_requests mr
        JOIN rental_units ru ON mr.unit_id = ru.unit_id
        JOIN buildings b ON ru.building_id = b.building_id
        WHERE mr.status = 'Open'
        ORDER BY mr.urgency DESC, mr.request_date ASC
        LIMIT 20
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/operational/resolution-time-trend")
def operational_resolution_time_trend():
    """Resolution time vs target"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            strftime('%Y-%m', completion_date) as period,
            ROUND(AVG(CASE WHEN completion_date IS NOT NULL 
                THEN julianday(completion_date) - julianday(request_date) 
                ELSE NULL END), 1) as avg_resolution_days
        FROM maintenance_requests
        WHERE status = 'Completed'
        GROUP BY strftime('%Y-%m', completion_date)
        ORDER BY period DESC
        LIMIT 6
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/operational/requests-by-category")
def operational_requests_by_category():
    """Maintenance by category"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            category,
            COUNT(*) as count,
            ROUND(AVG(cost), 2) as avg_cost,
            SUM(cost) as total_cost
        FROM maintenance_requests
        GROUP BY category
        ORDER BY count DESC
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/operational/incidents-summary")
def operational_incidents_summary():
    """Incidents by severity"""
    try:
        conn = get_db()
        
        query = '''
        SELECT 
            severity,
            type,
            COUNT(*) as count,
            ROUND(AVG(cost), 2) as avg_cost,
            SUM(cost) as total_cost
        FROM incidents
        GROUP BY severity, type
        ORDER BY severity DESC
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        return {"data": df.to_dict(orient='records')}
    except Exception as e:
        return {"error": str(e)}, 500

# ============================================================================
# DATABASE ENDPOINTS
# ============================================================================

@app.get("/api/database/stats")
def database_stats():
    """Database statistics"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        tables = {
            'buildings': 'SELECT COUNT(*) FROM buildings',
            'rental_units': 'SELECT COUNT(*) FROM rental_units',
            'tenants': 'SELECT COUNT(*) FROM tenants',
            'leases': 'SELECT COUNT(*) FROM leases',
            'financial_transactions': 'SELECT COUNT(*) FROM financial_transactions',
            'maintenance_requests': 'SELECT COUNT(*) FROM maintenance_requests',
            'incidents': 'SELECT COUNT(*) FROM incidents',
        }
        
        stats = {}
        for table, query in tables.items():
            cursor.execute(query)
            stats[table] = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "data": stats,
            "total_records": sum(stats.values()),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e)}, 500

# ============================================================================
# RUN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

#!/usr/bin/env python3
"""
FastAPI Backend for Property Management Dashboard
Queries immobilier_real.db and exposes endpoints for frontend
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import pandas as pd
import json
from datetime import datetime
from typing import List, Dict, Any

app = FastAPI(
    title="Dashboard Dirigeants API",
    description="API for real estate property management dashboard",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "immobilier_real.db"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_db_connection():
    """Get SQLite connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def query_to_dict(query: str) -> List[Dict[str, Any]]:
    """Execute query and return as list of dicts"""
    try:
        conn = get_db_connection()
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df.to_dict('records')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM buildings;")
        count = cursor.fetchone()[0]
        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "buildings_count": count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ============================================================================
# VUE GLOBALE (Global Overview)
# ============================================================================

@app.get("/api/global/summary")
def get_global_summary():
    """Global KPIs: revenue, occupancy, maintenance, incidents"""
    
    queries = {
        "revenue": """
            SELECT ROUND(SUM(CASE WHEN type = 'Rent' AND status = 'Paid' THEN amount ELSE 0 END), 2) as total
            FROM financial_transactions
            WHERE strftime('%Y-%m', transaction_date) = strftime('%Y-%m', 'now')
        """,
        "occupancy": """
            SELECT ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) / 
                    (SELECT COUNT(*) FROM rental_units), 2) as rate
            FROM leases l
        """,
        "open_requests": """
            SELECT COUNT(*) as count FROM maintenance_requests WHERE status = 'Open'
        """,
        "critical_incidents": """
            SELECT COUNT(*) as count FROM incidents WHERE severity = 'Critical'
        """
    }
    
    results = {}
    for key, query in queries.items():
        data = query_to_dict(query)
        if data:
            results[key] = data[0]
    
    return results

@app.get("/api/global/revenue-expense")
def get_global_revenue_expense():
    """Monthly revenue vs expenses (last 12 months)"""
    
    query = """
        SELECT 
            strftime('%Y-%m', ft.transaction_date) as period,
            ROUND(SUM(CASE WHEN ft.type = 'Rent' THEN ft.amount ELSE 0 END), 0) as revenue,
            ROUND(SUM(CASE WHEN ft.type IN ('Maintenance', 'Utility', 'Tax') THEN ft.amount ELSE 0 END), 0) as expenses
        FROM financial_transactions ft
        GROUP BY strftime('%Y-%m', ft.transaction_date)
        ORDER BY period DESC
        LIMIT 12
    """
    
    data = query_to_dict(query)
    data.reverse()  # Chronological order
    return {"data": data}

@app.get("/api/global/incident-distribution")
def get_incident_distribution():
    """Incident distribution by type"""
    
    query = """
        SELECT 
            type,
            COUNT(*) as count
        FROM incidents
        GROUP BY type
        ORDER BY count DESC
    """
    
    data = query_to_dict(query)
    return {
        "labels": [d['type'] for d in data],
        "data": [d['count'] for d in data]
    }

# ============================================================================
# VUE FINANCIÈRE (Financial)
# ============================================================================

@app.get("/api/financial/monthly-summary")
def get_financial_monthly():
    """Monthly financial overview (last 12 months)"""
    
    query = """
        SELECT 
            strftime('%Y-%m', ft.transaction_date) AS period,
            ROUND(SUM(CASE WHEN ft.type = 'Rent' THEN ft.amount ELSE 0 END), 2) AS rent_due,
            ROUND(SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END), 2) AS rent_collected,
            ROUND(100.0 * SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END) /
                  NULLIF(SUM(CASE WHEN ft.type = 'Rent' THEN ft.amount ELSE 0 END), 0), 2) AS collection_rate,
            ROUND(SUM(CASE WHEN ft.type IN ('Maintenance', 'Utility', 'Tax') THEN ft.amount ELSE 0 END), 2) AS operating_expenses,
            ROUND(SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END) -
                  SUM(CASE WHEN ft.type IN ('Maintenance', 'Utility', 'Tax') THEN ft.amount ELSE 0 END), 2) AS net_margin
        FROM financial_transactions ft
        GROUP BY strftime('%Y-%m', ft.transaction_date)
        ORDER BY period DESC
        LIMIT 12
    """
    
    data = query_to_dict(query)
    data.reverse()
    return {"data": data}

@app.get("/api/financial/cost-structure")
def get_cost_structure():
    """Cost breakdown by category"""
    
    query = """
        SELECT 
            type as category,
            ROUND(SUM(amount), 2) as total,
            ROUND(100.0 * SUM(amount) / (SELECT SUM(amount) FROM financial_transactions 
                  WHERE type IN ('Maintenance', 'Utility', 'Tax')), 2) as percentage
        FROM financial_transactions
        WHERE type IN ('Maintenance', 'Utility', 'Tax')
        GROUP BY type
        ORDER BY total DESC
    """
    
    data = query_to_dict(query)
    return {
        "labels": [d['category'] for d in data],
        "data": [d['total'] for d in data]
    }

@app.get("/api/financial/deposits")
def get_deposits_summary():
    """Deposits collected and held"""
    
    query = """
        SELECT 
            COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) as active_leases,
            ROUND(SUM(CASE WHEN l.status = 'Active' THEN l.deposit_amount ELSE 0 END), 2) as deposits_held
        FROM leases l
    """
    
    data = query_to_dict(query)
    return data[0] if data else {}

# ============================================================================
# VUE COMMERCIALE (Commercial)
# ============================================================================

@app.get("/api/commercial/occupancy-by-building")
def get_occupancy_by_building():
    """Current occupancy rate by building"""
    
    query = """
        SELECT 
            b.building_id,
            b.name as building_name,
            COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) as occupied_units,
            b.total_units,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.lease_id END) / b.total_units, 2) as occupancy_rate
        FROM buildings b
        LEFT JOIN rental_units ru ON b.building_id = ru.building_id
        LEFT JOIN leases l ON ru.unit_id = l.unit_id
        GROUP BY b.building_id, b.name, b.total_units
        ORDER BY occupancy_rate DESC
    """
    
    data = query_to_dict(query)
    return {"data": data}

@app.get("/api/commercial/occupancy-trend")
def get_occupancy_trend():
    """Occupancy trend over time"""
    
    query = """
        SELECT 
            strftime('%Y-%m', l.start_date) AS period,
            ROUND(100.0 * COUNT(DISTINCT l.lease_id) / (SELECT COUNT(*) FROM rental_units), 2) AS occupancy_rate
        FROM leases l
        WHERE l.status = 'Active'
        GROUP BY strftime('%Y-%m', l.start_date)
        ORDER BY period DESC
        LIMIT 12
    """
    
    data = query_to_dict(query)
    data.reverse()
    return {"data": data}

@app.get("/api/commercial/lease-expirations")
def get_lease_expirations():
    """Lease expirations by quarter"""
    
    query = """
        SELECT 
            CASE 
                WHEN strftime('%Y', end_date) = '2024' THEN 'Q' || (CAST(strftime('%m', end_date) AS INTEGER) - 1) / 3 + 1 || ' 2024'
                WHEN strftime('%Y', end_date) = '2025' THEN 'Q' || (CAST(strftime('%m', end_date) AS INTEGER) - 1) / 3 + 1 || ' 2025'
                ELSE '2026+'
            END as period,
            COUNT(*) as count
        FROM leases
        WHERE status = 'Terminated'
        GROUP BY period
        ORDER BY period
    """
    
    data = query_to_dict(query)
    return {"data": data}

@app.get("/api/commercial/turnover-rate")
def get_turnover_rate():
    """Annual tenant turnover rate"""
    
    query = """
        SELECT 
            strftime('%Y', end_date) as year,
            COUNT(*) as terminated_leases,
            ROUND(100.0 * COUNT(*) / (SELECT COUNT(DISTINCT unit_id) FROM rental_units), 2) as turnover_rate_pct
        FROM leases
        WHERE status = 'Terminated'
        GROUP BY year
        ORDER BY year DESC
    """
    
    data = query_to_dict(query)
    return {"data": data}

# ============================================================================
# VUE OPÉRATIONNELLE (Operational)
# ============================================================================

@app.get("/api/operational/maintenance-summary")
def get_maintenance_summary():
    """Maintenance requests summary"""
    
    query = """
        SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_requests,
            ROUND(AVG(CASE 
                WHEN completion_date IS NOT NULL 
                THEN julianday(completion_date) - julianday(request_date)
                ELSE NULL 
            END), 1) as avg_resolution_days,
            ROUND(SUM(cost), 2) as total_cost
        FROM maintenance_requests
    """
    
    data = query_to_dict(query)
    return data[0] if data else {}

@app.get("/api/operational/open-requests")
def get_open_requests():
    """Currently open maintenance requests"""
    
    query = """
        SELECT 
            mr.request_id,
            b.name as building_name,
            ru.unit_number,
            mr.category,
            mr.urgency,
            mr.request_date,
            CAST(julianday('now') - julianday(mr.request_date) AS INTEGER) as days_open,
            mr.description
        FROM maintenance_requests mr
        JOIN rental_units ru ON mr.unit_id = ru.unit_id
        JOIN buildings b ON ru.building_id = b.building_id
        WHERE mr.status = 'Open'
        ORDER BY CASE WHEN mr.urgency = 'Critical' THEN 1 
                      WHEN mr.urgency = 'High' THEN 2
                      WHEN mr.urgency = 'Medium' THEN 3
                      ELSE 4 END,
                 mr.request_date ASC
    """
    
    data = query_to_dict(query)
    return {"data": data}

@app.get("/api/operational/resolution-time-trend")
def get_resolution_time_trend():
    """Maintenance resolution time trend"""
    
    query = """
        SELECT 
            strftime('%Y-%m', mr.request_date) AS period,
            ROUND(AVG(CASE 
                WHEN mr.completion_date IS NOT NULL 
                THEN julianday(mr.completion_date) - julianday(mr.request_date)
                ELSE NULL 
            END), 1) as avg_resolution_days
        FROM maintenance_requests mr
        GROUP BY period
        ORDER BY period DESC
        LIMIT 12
    """
    
    data = query_to_dict(query)
    data.reverse()
    return {"data": data}

@app.get("/api/operational/requests-by-category")
def get_requests_by_category():
    """Maintenance requests by category"""
    
    query = """
        SELECT 
            category,
            COUNT(*) as count
        FROM maintenance_requests
        GROUP BY category
        ORDER BY count DESC
    """
    
    data = query_to_dict(query)
    return {
        "labels": [d['category'] for d in data],
        "data": [d['count'] for d in data]
    }

@app.get("/api/operational/incidents-summary")
def get_incidents_summary():
    """Incidents summary by severity"""
    
    query = """
        SELECT 
            COUNT(*) as total_incidents,
            COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical,
            COUNT(CASE WHEN severity = 'High' THEN 1 END) as high,
            ROUND(SUM(cost), 2) as total_cost
        FROM incidents
    """
    
    data = query_to_dict(query)
    return data[0] if data else {}

@app.get("/api/operational/incidents-by-severity")
def get_incidents_by_severity():
    """Incidents distribution by severity"""
    
    query = """
        SELECT 
            severity,
            COUNT(*) as count,
            ROUND(SUM(cost), 2) as total_cost
        FROM incidents
        GROUP BY severity
        ORDER BY count DESC
    """
    
    data = query_to_dict(query)
    return {"data": data}

# ============================================================================
# DATABASE INFO
# ============================================================================

@app.get("/api/database/stats")
def get_database_stats():
    """Get database statistics"""
    
    tables_info = {}
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        count = cursor.fetchone()[0]
        tables_info[table_name] = count
    
    conn.close()
    
    return {
        "database": DB_PATH,
        "tables": tables_info,
        "total_records": sum(tables_info.values()),
        "timestamp": datetime.now().isoformat()
    }

# ============================================================================
# ROOT
# ============================================================================

@app.get("/")
def root():
    """API documentation"""
    return {
        "name": "Dashboard Dirigeants API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "global": [
                "/api/global/summary",
                "/api/global/revenue-expense",
                "/api/global/incident-distribution"
            ],
            "financial": [
                "/api/financial/monthly-summary",
                "/api/financial/cost-structure",
                "/api/financial/deposits"
            ],
            "commercial": [
                "/api/commercial/occupancy-by-building",
                "/api/commercial/occupancy-trend",
                "/api/commercial/lease-expirations",
                "/api/commercial/turnover-rate"
            ],
            "operational": [
                "/api/operational/maintenance-summary",
                "/api/operational/open-requests",
                "/api/operational/resolution-time-trend",
                "/api/operational/requests-by-category",
                "/api/operational/incidents-summary",
                "/api/operational/incidents-by-severity"
            ]
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

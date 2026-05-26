-- ============================================================================
-- DASHBOARD DIRIGEANTS — SQL QUERIES
-- Three views: Financière, Commerciale, Opérationnelle
-- ============================================================================

-- ============================================================================
-- VUE FINANCIÈRE — Monthly breakdown by building
-- ============================================================================

-- 1. Monthly revenue and collection rates by building
SELECT 
    STRFTIME('%Y-%m', ft.transaction_date) AS period,
    ft.building_id,
    b.name AS building_name,
    
    -- Rent revenue (target)
    ROUND(SUM(CASE WHEN ft.type = 'Rent' THEN ft.amount ELSE 0 END), 2) AS rent_due,
    
    -- Rent collected (paid)
    ROUND(SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END), 2) AS rent_collected,
    
    -- Collection rate (%)
    ROUND(100.0 * SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END) /
          NULLIF(SUM(CASE WHEN ft.type = 'Rent' THEN ft.amount ELSE 0 END), 0), 2) AS collection_rate_pct,
    
    -- Operating expenses
    ROUND(SUM(CASE WHEN ft.type IN ('Maintenance', 'Utility', 'Tax') THEN ft.amount ELSE 0 END), 2) AS operating_expenses,
    
    -- Net margin
    ROUND(SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END) -
          SUM(CASE WHEN ft.type IN ('Maintenance', 'Utility', 'Tax') THEN ft.amount ELSE 0 END), 2) AS net_margin
    
FROM financial_transactions ft
LEFT JOIN buildings b ON ft.building_id = b.building_id
GROUP BY STRFTIME('%Y-%m', ft.transaction_date), ft.building_id, b.name
ORDER BY period DESC, building_id;

-- 2. Global financial overview (all buildings, monthly)
SELECT 
    STRFTIME('%Y-%m', ft.transaction_date) AS period,
    
    ROUND(SUM(CASE WHEN ft.type = 'Rent' THEN ft.amount ELSE 0 END), 2) AS total_rent_due,
    ROUND(SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END), 2) AS total_rent_collected,
    ROUND(100.0 * SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END) /
          NULLIF(SUM(CASE WHEN ft.type = 'Rent' THEN ft.amount ELSE 0 END), 0), 2) AS overall_collection_rate_pct,
    
    ROUND(SUM(CASE WHEN ft.type = 'Maintenance' THEN ft.amount ELSE 0 END), 2) AS maintenance_costs,
    ROUND(SUM(CASE WHEN ft.type = 'Utility' THEN ft.amount ELSE 0 END), 2) AS utility_costs,
    ROUND(SUM(CASE WHEN ft.type = 'Tax' THEN ft.amount ELSE 0 END), 2) AS tax_costs,
    
    ROUND(SUM(CASE WHEN ft.type IN ('Maintenance', 'Utility', 'Tax') THEN ft.amount ELSE 0 END), 2) AS total_operating_expenses,
    
    ROUND(SUM(CASE WHEN ft.type = 'Rent' AND ft.status = 'Paid' THEN ft.amount ELSE 0 END) -
          SUM(CASE WHEN ft.type IN ('Maintenance', 'Utility', 'Tax') THEN ft.amount ELSE 0 END), 2) AS total_net_margin
    
FROM financial_transactions ft
GROUP BY STRFTIME('%Y-%m', ft.transaction_date)
ORDER BY period DESC;

-- 3. Active deposits (guarantee deposits currently held)
SELECT 
    b.building_id,
    b.name AS building_name,
    COUNT(DISTINCT l.lease_id) AS active_leases,
    ROUND(SUM(CASE WHEN l.status = 'Active' THEN l.deposit_amount ELSE 0 END), 2) AS deposits_held
FROM leases l
JOIN buildings b ON l.unit_id IN (SELECT unit_id FROM rental_units WHERE building_id = b.building_id)
WHERE l.status = 'Active'
GROUP BY b.building_id, b.name
ORDER BY deposits_held DESC;


-- ============================================================================
-- VUE COMMERCIALE — Occupancy, lease turnover, demand
-- ============================================================================

-- 1. Current occupancy by building
SELECT 
    b.building_id,
    b.name AS building_name,
    ru.total_units,
    COUNT(DISTINCT l.lease_id) AS occupied_units,
    ROUND(100.0 * COUNT(DISTINCT l.lease_id) / ru.total_units, 2) AS occupancy_rate_pct,
    ru.total_units - COUNT(DISTINCT l.lease_id) AS vacant_units
FROM buildings b
LEFT JOIN (
    SELECT building_id, COUNT(*) AS total_units FROM rental_units GROUP BY building_id
) ru ON b.building_id = ru.building_id
LEFT JOIN rental_units u ON b.building_id = u.building_id
LEFT JOIN leases l ON u.unit_id = l.unit_id AND l.status = 'Active'
GROUP BY b.building_id, b.name, ru.total_units
ORDER BY occupancy_rate_pct DESC;

-- 2. Occupancy trend (monthly)
SELECT 
    STRFTIME('%Y-%m', l.start_date) AS period,
    COUNT(DISTINCT l.lease_id) AS total_active_leases,
    ROUND(100.0 * COUNT(DISTINCT l.lease_id) / (SELECT COUNT(*) FROM rental_units), 2) AS portfolio_occupancy_pct
FROM leases l
WHERE l.status = 'Active'
GROUP BY STRFTIME('%Y-%m', l.start_date)
ORDER BY period;

-- 3. Lease turnover (tenant rotation) by year
SELECT 
    STRFTIME('%Y', l.end_date) AS year,
    COUNT(*) AS terminated_leases,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(DISTINCT unit_id) FROM rental_units), 2) AS turnover_rate_pct
FROM leases l
WHERE l.status = 'Terminated'
GROUP BY STRFTIME('%Y', l.end_date)
ORDER BY year DESC;

-- 4. Lease duration analysis
SELECT 
    b.building_id,
    b.name AS building_name,
    ROUND(AVG(CAST((julianday(l.end_date) - julianday(l.start_date)) AS REAL) / 365.0), 1) AS avg_lease_duration_years,
    COUNT(*) AS total_leases
FROM leases l
JOIN rental_units u ON l.unit_id = u.unit_id
JOIN buildings b ON u.building_id = b.building_id
WHERE l.status = 'Terminated'
GROUP BY b.building_id, b.name
ORDER BY avg_lease_duration_years DESC;

-- 5. Deposits collected (current balance by building)
SELECT 
    b.building_id,
    b.name AS building_name,
    COUNT(DISTINCT CASE WHEN ft.type = 'Deposit_In' THEN ft.transaction_id END) AS deposits_in_count,
    ROUND(SUM(CASE WHEN ft.type = 'Deposit_In' THEN ft.amount ELSE 0 END), 2) AS total_deposits_in,
    ROUND(SUM(CASE WHEN ft.type = 'Deposit_Out' THEN ft.amount ELSE 0 END), 2) AS total_deposits_out,
    ROUND(SUM(CASE WHEN ft.type = 'Deposit_In' THEN ft.amount ELSE 0 END) -
          SUM(CASE WHEN ft.type = 'Deposit_Out' THEN ft.amount ELSE 0 END), 2) AS net_deposits_held
FROM financial_transactions ft
LEFT JOIN buildings b ON ft.building_id = b.building_id
WHERE ft.type IN ('Deposit_In', 'Deposit_Out')
GROUP BY b.building_id, b.name
ORDER BY net_deposits_held DESC;


-- ============================================================================
-- VUE OPÉRATIONNELLE — Maintenance, incidents, resolution times
-- ============================================================================

-- 1. Maintenance request metrics by building (monthly)
SELECT 
    STRFTIME('%Y-%m', mr.request_date) AS period,
    b.building_id,
    b.name AS building_name,
    
    -- Count by status
    COUNT(*) AS total_requests,
    COUNT(CASE WHEN mr.status = 'Completed' THEN 1 END) AS completed_requests,
    COUNT(CASE WHEN mr.status = 'Open' THEN 1 END) AS open_requests,
    COUNT(CASE WHEN mr.status = 'In_Progress' THEN 1 END) AS in_progress_requests,
    
    -- Average resolution time (days)
    ROUND(AVG(CASE 
        WHEN mr.completion_date IS NOT NULL 
        THEN CAST((julianday(mr.completion_date) - julianday(mr.request_date)) AS REAL)
        ELSE NULL 
    END), 1) AS avg_resolution_days,
    
    -- Total cost
    ROUND(SUM(mr.cost), 2) AS total_maintenance_cost,
    ROUND(AVG(mr.cost), 2) AS avg_cost_per_request
    
FROM maintenance_requests mr
LEFT JOIN rental_units u ON mr.unit_id = u.unit_id
LEFT JOIN buildings b ON u.building_id = b.building_id
GROUP BY STRFTIME('%Y-%m', mr.request_date), b.building_id, b.name
ORDER BY period DESC, building_id;

-- 2. Current open maintenance requests (urgent ones first)
SELECT 
    mr.request_id,
    b.name AS building_name,
    ru.unit_number,
    mr.category,
    mr.urgency,
    mr.request_date,
    CAST((julianday('now') - julianday(mr.request_date)) AS INTEGER) AS days_open,
    mr.description
FROM maintenance_requests mr
JOIN rental_units ru ON mr.unit_id = ru.unit_id
JOIN buildings b ON ru.building_id = b.building_id
WHERE mr.status = 'Open'
ORDER BY CASE WHEN mr.urgency = 'Critical' THEN 1 
              WHEN mr.urgency = 'High' THEN 2
              WHEN mr.urgency = 'Medium' THEN 3
              ELSE 4 END,
         mr.request_date ASC;

-- 3. Maintenance by category (yearly analysis)
SELECT 
    STRFTIME('%Y', mr.request_date) AS year,
    mr.category,
    COUNT(*) AS request_count,
    ROUND(SUM(mr.cost), 2) AS total_cost,
    ROUND(AVG(mr.cost), 2) AS avg_cost,
    ROUND(AVG(CASE 
        WHEN mr.completion_date IS NOT NULL 
        THEN CAST((julianday(mr.completion_date) - julianday(mr.request_date)) AS REAL)
        ELSE NULL 
    END), 1) AS avg_resolution_days
FROM maintenance_requests mr
GROUP BY STRFTIME('%Y', mr.request_date), mr.category
ORDER BY year DESC, total_cost DESC;

-- 4. Incidents summary by building
SELECT 
    b.building_id,
    b.name AS building_name,
    COUNT(*) AS total_incidents,
    COUNT(CASE WHEN i.severity = 'Critical' THEN 1 END) AS critical_incidents,
    COUNT(CASE WHEN i.severity = 'High' THEN 1 END) AS high_incidents,
    ROUND(SUM(i.cost), 2) AS total_cost,
    ROUND(AVG(i.cost), 2) AS avg_cost
FROM incidents i
LEFT JOIN buildings b ON i.building_id = b.building_id
GROUP BY b.building_id, b.name
ORDER BY total_cost DESC;

-- 5. Incidents timeline (monthly, severity breakdown)
SELECT 
    STRFTIME('%Y-%m', i.incident_date) AS period,
    COUNT(*) AS total_incidents,
    COUNT(CASE WHEN i.severity = 'Critical' THEN 1 END) AS critical,
    COUNT(CASE WHEN i.severity = 'High' THEN 1 END) AS high,
    COUNT(CASE WHEN i.severity = 'Medium' THEN 1 END) AS medium,
    COUNT(CASE WHEN i.severity = 'Low' THEN 1 END) AS low,
    ROUND(SUM(i.cost), 2) AS total_cost
FROM incidents i
GROUP BY STRFTIME('%Y-%m', i.incident_date)
ORDER BY period DESC;

-- 6. Maintenance cost trend per unit (yearly)
SELECT 
    STRFTIME('%Y', mr.request_date) AS year,
    ROUND(SUM(mr.cost) / (SELECT COUNT(*) FROM rental_units), 2) AS avg_cost_per_unit,
    ROUND(SUM(mr.cost), 2) AS total_maintenance_cost
FROM maintenance_requests mr
GROUP BY STRFTIME('%Y', mr.request_date)
ORDER BY year DESC;


-- ============================================================================
-- BONUS QUERIES — Dashboard summary cards
-- ============================================================================

-- Current KPI snapshot (today)
SELECT 
    'Occupancy Rate' AS kpi,
    ROUND(100.0 * COUNT(DISTINCT l.lease_id) / (SELECT COUNT(*) FROM rental_units), 2) || '%' AS value
FROM leases l
WHERE l.status = 'Active'

UNION ALL

SELECT 
    'Portfolio Monthly Revenue' AS kpi,
    '€ ' || ROUND(SUM(l.monthly_rent), 2) AS value
FROM leases l
WHERE l.status = 'Active'

UNION ALL

SELECT 
    'Open Maintenance Requests' AS kpi,
    CAST(COUNT(*) AS TEXT) AS value
FROM maintenance_requests
WHERE status = 'Open'

UNION ALL

SELECT 
    'Critical Incidents (YTD)' AS kpi,
    CAST(COUNT(*) AS TEXT) AS value
FROM incidents
WHERE severity = 'Critical' AND STRFTIME('%Y', incident_date) = STRFTIME('%Y', 'now');

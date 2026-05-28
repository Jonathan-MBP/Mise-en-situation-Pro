const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'files 2', 'immobilier.db');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

// Open database connection
let db;
try {
    db = new DatabaseSync(DB_PATH);
    console.log(`Successfully connected to SQLite database at: ${DB_PATH}`);
} catch (err) {
    console.error('Failed to open SQLite database:', err);
}

const server = http.createServer((req, res) => {
    // API endpoint for dashboard data
    if (req.url === '/api/dashboard-data' && req.method === 'GET') {
        try {
            const data = getDashboardData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (err) {
            console.error('API Error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error', details: err.message }));
        }
        return;
    }

    // Static files serving
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // Safety check: ensure the file path is within the workspace directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(__dirname))) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(resolvedPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(resolvedPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Dashboard server running at http://localhost:${PORT}/`);
});

function getDashboardData() {
    // Helpers to format currency
    const formatM = (val) => (val / 1000000).toFixed(1) + 'M €';
    const formatK = (val) => (val / 1000).toFixed(0) + 'k €';

    // 1. GLOBAL DATA & KPIs
    const totalRent = db.prepare("SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'Rent' AND status = 'Paid'").all()[0].val || 0;
    const activeLeases = db.prepare("SELECT COUNT(*) as val FROM leases WHERE status = 'Active'").all()[0].val || 0;
    const totalUnits = db.prepare("SELECT COUNT(*) as val FROM rental_units").all()[0].val || 1;
    const occupancyRate = (activeLeases / totalUnits) * 100;
    
    const openRequests = db.prepare("SELECT COUNT(*) as val FROM maintenance_requests WHERE status = 'Open'").all()[0].val || 0;
    const criticalIncidents = db.prepare("SELECT COUNT(*) as val FROM incidents WHERE severity = 'Critical'").all()[0].val || 0;

    // 2. REVENUE & EXPENSE CHART (Monthly)
    // We fetch the last 12 periods (months) in chronological order
    const monthlyData = db.prepare(`
        SELECT 
            STRFTIME('%Y-%m', transaction_date) AS period,
            SUM(CASE WHEN type = 'Rent' AND status = 'Paid' THEN amount ELSE 0 END) AS rent,
            SUM(CASE WHEN type IN ('Maintenance', 'Utility', 'Tax') THEN amount ELSE 0 END) AS opex
        FROM financial_transactions
        GROUP BY period
        ORDER BY period DESC
        LIMIT 12
    `).all().reverse();

    const monthNames = {
        '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
        '07': 'Juil', '08': 'Août', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc'
    };
    const revExpLabels = monthlyData.map(d => {
        if (!d.period) return 'N/A';
        const parts = d.period.split('-');
        const month = parts[1];
        const year = parts[0];
        return `${monthNames[month] || month} ${year.slice(2)}`;
    });
    const revData = monthlyData.map(d => Math.round(d.rent / 1000));
    const expData = monthlyData.map(d => Math.round(d.opex / 1000));

    // 3. INCIDENT DISTRIBUTION (Global Pie Chart)
    const incidentData = db.prepare(`
        SELECT type, COUNT(*) as count 
        FROM incidents 
        GROUP BY type 
        ORDER BY count DESC
    `).all();
    const incTranslations = {
        'Fire': 'Incendie',
        'Break_in': 'Cambriolage',
        'Accident': 'Accident',
        'Leak': 'Fuite',
        'Flood': 'Inondation'
    };
    const incLabels = incidentData.map(d => incTranslations[d.type] || d.type);
    const incCounts = incidentData.map(d => d.count);

    // 4. FINANCIAL KPIs & COST STRUCTURE
    // Compute total operating expenses including transaction OPEX, maintenance costs, and incident costs
    const utilityCost = db.prepare("SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'Utility'").all()[0].val || 0;
    const taxCost = db.prepare("SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'Tax'").all()[0].val || 0;
    const maintenanceCost = db.prepare("SELECT SUM(cost) as val FROM maintenance_requests").all()[0].val || 0;
    const incidentCost = db.prepare("SELECT SUM(cost) as val FROM incidents").all()[0].val || 0;
    
    const opex = utilityCost + taxCost + maintenanceCost + incidentCost;
    const netMargin = totalRent - opex;
    
    const rentDue = db.prepare("SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'Rent'").all()[0].val || 1;
    const collectionRate = (totalRent / rentDue) * 100;
    
    const activeDeposits = db.prepare("SELECT SUM(deposit_amount) as val FROM leases WHERE status = 'Active'").all()[0].val || 0;

    // Financial Chart: Quarters
    const qrData = db.prepare(`
        SELECT 
            STRFTIME('%Y', transaction_date) || '-Q' || ((CAST(STRFTIME('%m', transaction_date) AS INTEGER) - 1) / 3 + 1) AS quarter,
            SUM(CASE WHEN type = 'Rent' AND status = 'Paid' THEN amount ELSE 0 END) AS rent,
            SUM(CASE WHEN type IN ('Utility', 'Tax') THEN amount ELSE 0 END) AS opex
        FROM financial_transactions
        GROUP BY quarter
        ORDER BY quarter DESC
        LIMIT 6
    `).all().reverse();
    
    const qLabels = qrData.map(d => d.quarter);
    // Add maintenance and incidents costs proportionally or display base costs
    const qRev = qrData.map(d => Math.round(d.rent / 1000));
    const qCosts = qrData.map(d => Math.round(d.opex / 1000));

    // Cost Structure Breakdown (in percentages)
    const costLabels = ['Maintenance', 'Services Publics', 'Taxes', 'Incidents'];
    const costStructureData = [
        Math.round((maintenanceCost / opex) * 100),
        Math.round((utilityCost / opex) * 100),
        Math.round((taxCost / opex) * 100),
        Math.round((incidentCost / opex) * 100)
    ];

    // 5. COMMERCIAL KPIs & CHARTS
    const leaseDelayData = db.prepare(`
        SELECT AVG(julianday(start_date) - julianday(created_at)) as delay FROM leases
    `).all()[0].delay || 15;
    const avgLeaseDelay = Math.round(leaseDelayData) + ' jrs';

    const depositsCollected = db.prepare(`
        SELECT SUM(CASE WHEN type = 'Deposit_In' THEN amount ELSE 0 END) -
               SUM(CASE WHEN type = 'Deposit_Out' THEN amount ELSE 0 END) as net
        FROM financial_transactions
    `).all()[0].net || 0;

    const tenantTurnover = db.prepare("SELECT COUNT(*) as val FROM leases WHERE status = 'Terminated'").all()[0].val || 0;

    // Occupancy Trend (last 6 months)
    const occupancyTrendLabels = [];
    const occupancyTrendData = [];
    const now = new Date(2025, 0, 30); // Using the database end-date as context
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const periodLabel = `${monthNames[mm]} ${String(yyyy).slice(2)}`;
        
        const monthEnd = `${yyyy}-${mm}-31`;
        const activeInMonth = db.prepare(`
            SELECT COUNT(*) as count FROM leases 
            WHERE start_date <= ? AND (end_date >= ? OR status = 'Active')
        `).all(monthEnd, `${yyyy}-${mm}-01`)[0].count;
        
        const occRate = (activeInMonth / totalUnits) * 100;
        occupancyTrendLabels.push(periodLabel);
        occupancyTrendData.push(parseFloat(occRate.toFixed(1)));
    }

    // Lease Expirations (Grouped by year)
    const expirations = db.prepare(`
        SELECT 
            CASE 
                WHEN end_date IS NULL THEN 'Indéterminé'
                WHEN end_date LIKE '2025%' THEN '2025'
                WHEN end_date LIKE '2026%' THEN '2026'
                WHEN end_date LIKE '2027%' THEN '2027'
                ELSE '2028+'
            END as exp_year,
            COUNT(*) as count
        FROM leases
        WHERE status = 'Active'
        GROUP BY exp_year
        ORDER BY exp_year
    `).all();
    const leaseExpLabels = expirations.map(e => e.exp_year);
    const leaseExpData = expirations.map(e => e.count);

    // 6. OPERATIONAL KPIs & CHARTS
    const resolutionDays = db.prepare(`
        SELECT AVG(julianday(completion_date) - julianday(request_date)) as avg_days 
        FROM maintenance_requests 
        WHERE status = 'Completed'
    `).all()[0].avg_days || 3.5;
    
    const avgMaintenanceCost = db.prepare("SELECT AVG(cost) as val FROM maintenance_requests WHERE status = 'Completed'").all()[0].val || 0;
    
    const criticalIncidentsCost = db.prepare(`
        SELECT COUNT(*) as count, SUM(cost) as cost 
        FROM incidents 
        WHERE severity = 'Critical'
    `).all()[0];

    // Resolution Time Trend
    const resTimeLabels = [];
    const resTimeActual = [];
    const resTimeTarget = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const periodStr = `${yyyy}-${mm}`;
        const periodLabel = `${monthNames[mm]} ${String(yyyy).slice(2)}`;
        
        const avgRes = db.prepare(`
            SELECT AVG(julianday(completion_date) - julianday(request_date)) as avg_days 
            FROM maintenance_requests 
            WHERE status = 'Completed' AND completion_date LIKE ?
        `).all(`${periodStr}%`)[0].avg_days || 3.0;
        
        resTimeLabels.push(periodLabel);
        resTimeActual.push(parseFloat(avgRes.toFixed(1)));
        resTimeTarget.push(3.0);
    }

    // Requests by Category
    const requestsCat = db.prepare(`
        SELECT category, COUNT(*) as count 
        FROM maintenance_requests 
        GROUP BY category
        ORDER BY count DESC
    `).all();
    const catTranslations = {
        'Plumbing': 'Plomberie',
        'Electric': 'Électricité',
        'HVAC': 'CVC',
        'Structural': 'Structure',
        'Other': 'Autre'
    };
    const reqCatLabels = requestsCat.map(r => catTranslations[r.category] || r.category);
    const reqCatData = requestsCat.map(r => r.count);

    return {
        global: {
            kpi: {
                revenue: formatM(totalRent),
                occupancy: occupancyRate.toFixed(1) + '%',
                openRequests: String(openRequests),
                criticalIncidents: String(criticalIncidents)
            },
            charts: {
                revenueExpense: {
                    labels: revExpLabels,
                    revenue: revData,
                    expense: expData
                },
                incidentDistribution: {
                    labels: incLabels,
                    data: incCounts
                }
            }
        },
        financial: {
            kpi: {
                rentRevenue: formatM(totalRent),
                collectionRate: collectionRate.toFixed(1) + '%',
                operatingExpenses: formatM(opex),
                netMargin: formatM(netMargin),
                activeDeposits: formatK(activeDeposits)
            },
            charts: {
                revVsCost: {
                    labels: qLabels,
                    revenue: qRev,
                    costs: qCosts
                },
                costStructure: {
                    labels: costLabels,
                    data: costStructureData
                }
            }
        },
        commercial: {
            kpi: {
                occupancyRate: occupancyRate.toFixed(1) + '%',
                avgLeaseDelay: avgLeaseDelay,
                depositsCollected: formatK(depositsCollected),
                tenantTurnover: String(tenantTurnover)
            },
            charts: {
                occupancyTrend: {
                    labels: occupancyTrendLabels,
                    data: occupancyTrendData
                },
                leaseExpirations: {
                    labels: leaseExpLabels,
                    data: leaseExpData
                }
            }
        },
        operational: {
            kpi: {
                avgResolutionTime: resolutionDays.toFixed(1) + ' jrs',
                openRequests: String(openRequests),
                avgMaintenanceCost: avgMaintenanceCost.toFixed(0) + ' €',
                criticalIncidents: `${criticalIncidentsCost.count} (${formatK(criticalIncidentsCost.cost || 0)})`
            },
            charts: {
                resolutionTimeTrend: {
                    labels: resTimeLabels,
                    actual: resTimeActual,
                    target: resTimeTarget
                },
                requestsByCategory: {
                    labels: reqCatLabels,
                    data: reqCatData
                }
            }
        }
    };
}

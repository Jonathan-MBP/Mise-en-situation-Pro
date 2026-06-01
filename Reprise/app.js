// ============================================================================
// DASHBOARD FRONTEND — Fetches real data from FastAPI
// ============================================================================

// Initialize Lucide Icons
lucide.createIcons();

// Chart Configuration Defaults
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
Chart.defaults.plugins.tooltip.bodyColor = '#f8fafc';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

// API Base URL (change if needed)
const API_BASE = 'http://localhost:8000';

const chartInstances = {};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard loading...');
    initNavigation();
    loadAllData();
});

// ============================================================================
// NAVIGATION
// ============================================================================

function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view-section');
    const viewTitle = document.getElementById('view-title');
    const subtitle = document.querySelector('.subtitle');

    const viewDetails = {
        global: { title: "Vue Globale", subtitle: "Performance générale du parc immobilier" },
        financial: { title: "Vue Financière", subtitle: "Revenus, loyers et dépenses" },
        commercial: { title: "Vue Commerciale", subtitle: "Occupation, baux et locataires" },
        operational: { title: "Vue Opérationnelle", subtitle: "Maintenance et incidents" }
    };

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const viewId = btn.getAttribute('data-view');
            document.getElementById(`view-${viewId}`).classList.add('active');

            viewTitle.textContent = viewDetails[viewId].title;
            subtitle.textContent = viewDetails[viewId].subtitle;
        });
    });
}

// ============================================================================
// API CALLS
// ============================================================================

async function fetchAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return null;
    }
}

async function loadAllData() {
    console.log('Loading all dashboard data...');
    
    // Load all data in parallel
    const [globalSummary, revExp, incidents, finMonthly, costStruct, comOcc, 
            comTrend, leaseExp, opMaint, opRes, opReqCat] = await Promise.all([
        fetchAPI('/api/global/summary'),
        fetchAPI('/api/global/revenue-expense'),
        fetchAPI('/api/global/incident-distribution'),
        fetchAPI('/api/financial/monthly-summary'),
        fetchAPI('/api/financial/cost-structure'),
        fetchAPI('/api/commercial/occupancy-by-building'),
        fetchAPI('/api/commercial/occupancy-trend'),
        fetchAPI('/api/commercial/lease-expirations'),
        fetchAPI('/api/operational/maintenance-summary'),
        fetchAPI('/api/operational/resolution-time-trend'),
        fetchAPI('/api/operational/requests-by-category')
    ]);

    console.log('Data loaded, populating dashboard...');

    // Populate KPIs
    populateKPIs(globalSummary, finMonthly, comOcc, opMaint);

    // Initialize charts
    initCharts(revExp, incidents, finMonthly, costStruct, 
               comTrend, leaseExp, opRes, opReqCat);
}

// ============================================================================
// POPULATE KPIs
// ============================================================================

function populateKPIs(global, financial, commercial, operational) {
    // Global KPIs
    if (global && global.revenue) {
        document.getElementById('kpi-global-revenue').textContent = 
            formatCurrency(global.revenue.total);
    }
    if (global && global.occupancy) {
        document.getElementById('kpi-global-occupancy').textContent = 
            global.occupancy.rate + '%';
    }
    if (global && global.open_requests) {
        document.getElementById('kpi-global-requests').textContent = 
            global.open_requests.count;
    }
    if (global && global.critical_incidents) {
        document.getElementById('kpi-global-incidents').textContent = 
            global.critical_incidents.count;
    }

    // Financial KPIs (from last month)
    if (financial && financial.data && financial.data.length > 0) {
        const latest = financial.data[financial.data.length - 1];
        document.getElementById('kpi-fin-rent').textContent = 
            formatCurrency(latest.rent_collected);
        document.getElementById('kpi-fin-collection').textContent = 
            latest.collection_rate + '%';
        document.getElementById('kpi-fin-opex').textContent = 
            formatCurrency(latest.operating_expenses);
        document.getElementById('kpi-fin-margin').textContent = 
            formatCurrency(latest.net_margin);
    }

    // Commercial KPIs
    if (commercial && commercial.data && commercial.data.length > 0) {
        const avgOccupancy = commercial.data.reduce((sum, b) => sum + b.occupancy_rate, 0) / commercial.data.length;
        document.getElementById('kpi-com-occupancy').textContent = 
            avgOccupancy.toFixed(1) + '%';
    }
    document.getElementById('kpi-com-delay').textContent = '18 jrs';
    document.getElementById('kpi-com-deposits').textContent = '35k €';
    document.getElementById('kpi-com-turnover').textContent = '45';

    // Operational KPIs
    if (operational) {
        if (operational.avg_resolution_days) {
            document.getElementById('kpi-op-resolution').textContent = 
                operational.avg_resolution_days + ' jrs';
        }
        if (operational.open_requests) {
            document.getElementById('kpi-op-open-requests').textContent = 
                operational.open_requests;
        }
        if (operational.total_cost && operational.total_requests) {
            const avgCost = (operational.total_cost / operational.total_requests).toFixed(0);
            document.getElementById('kpi-op-cost-unit').textContent = 
                avgCost + ' €';
        }
    }
    document.getElementById('kpi-op-incidents').textContent = '3';
}

// ============================================================================
// INITIALIZE CHARTS
// ============================================================================

function initCharts(revExp, incidents, finMonthly, costStruct, 
                    comTrend, leaseExp, opRes, opReqCat) {
    
    // Colors
    const blue = '#3b82f6';
    const green = '#10b981';
    const purple = '#8b5cf6';
    const orange = '#f97316';
    const red = '#ef4444';

    // 1. Global: Revenue vs Expense
    if (revExp && revExp.data) {
        const ctxGlobalRev = document.getElementById('globalRevenueChart');
        if (ctxGlobalRev) {
            chartInstances.globalRev = new Chart(ctxGlobalRev.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: revExp.data.map(d => d.period.split('-')[1]),
                    datasets: [
                        {
                            label: "Revenus (k€)",
                            data: revExp.data.map(d => d.revenue / 1000),
                            backgroundColor: 'rgba(59, 130, 246, 0.8)',
                            borderRadius: 4,
                            order: 2
                        },
                        {
                            label: "Dépenses (k€)",
                            data: revExp.data.map(d => d.expenses / 1000),
                            type: 'line',
                            borderColor: orange,
                            borderWidth: 3,
                            tension: 0.4,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // 2. Global: Incident Distribution
    if (incidents && incidents.labels) {
        const ctxGlobalInc = document.getElementById('globalIncidentChart');
        if (ctxGlobalInc) {
            chartInstances.globalInc = new Chart(ctxGlobalInc.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: incidents.labels,
                    datasets: [{
                        data: incidents.data,
                        backgroundColor: [blue, orange, purple, red, '#475569'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    }

    // 3. Financial: Rev vs Cost
    if (finMonthly && finMonthly.data) {
        const ctxFinRevCost = document.getElementById('financialRevCostChart');
        if (ctxFinRevCost) {
            chartInstances.finRevCost = new Chart(ctxFinRevCost.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: finMonthly.data.map(d => d.period.split('-')[1]),
                    datasets: [
                        {
                            label: 'Revenus Loyers (k€)',
                            data: finMonthly.data.map(d => d.rent_collected / 1000),
                            backgroundColor: blue,
                            borderRadius: 4
                        },
                        {
                            label: 'OPEX (k€)',
                            data: finMonthly.data.map(d => d.operating_expenses / 1000),
                            backgroundColor: orange,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // 4. Financial: Cost Structure
    if (costStruct && costStruct.labels) {
        const ctxFinCost = document.getElementById('financialCostStructureChart');
        if (ctxFinCost) {
            chartInstances.finCost = new Chart(ctxFinCost.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: costStruct.labels,
                    datasets: [{
                        data: costStruct.data,
                        backgroundColor: [blue, purple, orange, green, '#475569'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }
    }

    // 5. Commercial: Occupancy Trend
    if (comTrend && comTrend.data) {
        const ctxComOcc = document.getElementById('commercialOccupancyChart');
        if (ctxComOcc) {
            chartInstances.comOcc = new Chart(ctxComOcc.getContext('2d'), {
                type: 'line',
                data: {
                    labels: comTrend.data.map(d => d.period.split('-')[1]),
                    datasets: [{
                        label: "Taux d'Occupation (%)",
                        data: comTrend.data.map(d => d.occupancy_rate),
                        borderColor: green,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { min: 70, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // 6. Commercial: Lease Expirations
    if (leaseExp && leaseExp.data) {
        const ctxComLease = document.getElementById('commercialLeaseChart');
        if (ctxComLease) {
            chartInstances.comLease = new Chart(ctxComLease.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: leaseExp.data.map(d => d.period || 'Unknown'),
                    datasets: [{
                        label: 'Baux Expirants',
                        data: leaseExp.data.map(d => d.count),
                        backgroundColor: purple,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // 7. Operational: Resolution Time
    if (opRes && opRes.data) {
        const ctxOpRes = document.getElementById('operationalResolutionChart');
        if (ctxOpRes) {
            chartInstances.opRes = new Chart(ctxOpRes.getContext('2d'), {
                type: 'line',
                data: {
                    labels: opRes.data.map(d => d.period.split('-')[1]),
                    datasets: [
                        {
                            label: 'Actual (Jours)',
                            data: opRes.data.map(d => d.avg_resolution_days),
                            borderColor: blue,
                            backgroundColor: blue,
                            borderWidth: 3,
                            tension: 0.4
                        },
                        {
                            label: 'Target (Jours)',
                            data: Array(opRes.data.length).fill(3),
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            tension: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, max: 6, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // 8. Operational: Requests by Category
    if (opReqCat && opReqCat.labels) {
        const ctxOpReq = document.getElementById('operationalRequestsChart');
        if (ctxOpReq) {
            chartInstances.opReq = new Chart(ctxOpReq.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: opReqCat.labels,
                    datasets: [{
                        label: 'Nombre de Demandes',
                        data: opReqCat.data,
                        backgroundColor: [blue, orange, purple, '#475569', green],
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    console.log('All charts initialized');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(value) {
    if (!value) return '—';
    const num = parseFloat(value);
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M €';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k €';
    }
    return num.toFixed(0) + ' €';
}

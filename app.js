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

const chartInstances = {};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    fetchDashboardData();
});

async function fetchDashboardData() {
    try {
        const response = await fetch('/api/dashboard-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        Object.assign(dashboardData, data);
        console.log('Successfully loaded database data:', dashboardData);
    } catch (error) {
        console.error('Failed to load live database data. Falling back to mock data.', error);
    } finally {
        populateKPIs();
        initCharts();
    }
}

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
            // Remove active class from all
            navBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            // Add active class to clicked
            btn.classList.add('active');
            const viewId = btn.getAttribute('data-view');
            document.getElementById(`view-${viewId}`).classList.add('active');

            // Update Header
            viewTitle.textContent = viewDetails[viewId].title;
            subtitle.textContent = viewDetails[viewId].subtitle;
        });
    });
}

function populateKPIs() {
    // Global KPIs
    document.getElementById('kpi-global-revenue').textContent = dashboardData.global.kpi.revenue;
    document.getElementById('kpi-global-occupancy').textContent = dashboardData.global.kpi.occupancy;
    document.getElementById('kpi-global-requests').textContent = dashboardData.global.kpi.openRequests;
    document.getElementById('kpi-global-incidents').textContent = dashboardData.global.kpi.criticalIncidents;

    // Financial KPIs
    document.getElementById('kpi-fin-rent').textContent = dashboardData.financial.kpi.rentRevenue;
    document.getElementById('kpi-fin-collection').textContent = dashboardData.financial.kpi.collectionRate;
    document.getElementById('kpi-fin-opex').textContent = dashboardData.financial.kpi.operatingExpenses;
    document.getElementById('kpi-fin-margin').textContent = dashboardData.financial.kpi.netMargin;
    document.getElementById('kpi-fin-deposits').textContent = dashboardData.financial.kpi.activeDeposits;

    // Commercial KPIs
    document.getElementById('kpi-com-occupancy').textContent = dashboardData.commercial.kpi.occupancyRate;
    document.getElementById('kpi-com-delay').textContent = dashboardData.commercial.kpi.avgLeaseDelay;
    document.getElementById('kpi-com-deposits').textContent = dashboardData.commercial.kpi.depositsCollected;
    document.getElementById('kpi-com-turnover').textContent = dashboardData.commercial.kpi.tenantTurnover;

    // Operational KPIs
    document.getElementById('kpi-op-resolution').textContent = dashboardData.operational.kpi.avgResolutionTime;
    document.getElementById('kpi-op-open-requests').textContent = dashboardData.operational.kpi.openRequests;
    document.getElementById('kpi-op-cost-unit').textContent = dashboardData.operational.kpi.avgMaintenanceCost;
    document.getElementById('kpi-op-incidents').textContent = dashboardData.operational.kpi.criticalIncidents;
}

function initCharts() {
    // Colors
    const blue = '#3b82f6';
    const green = '#10b981';
    const purple = '#8b5cf6';
    const orange = '#f97316';
    const red = '#ef4444';

    // 1. Global: Revenue vs Expense
    const ctxGlobalRev = document.getElementById('globalRevenueChart').getContext('2d');
    chartInstances.globalRev = new Chart(ctxGlobalRev, {
        type: 'bar',
        data: {
            labels: dashboardData.global.charts.revenueExpense.labels,
            datasets: [
                {
                    label: "Revenus (k€)",
                    data: dashboardData.global.charts.revenueExpense.revenue,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: "Dépenses (k€)",
                    data: dashboardData.global.charts.revenueExpense.expense,
                    type: 'line',
                    borderColor: orange,
                    backgroundColor: orange,
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

    // 2. Global: Incident Distribution
    const ctxGlobalInc = document.getElementById('globalIncidentChart').getContext('2d');
    chartInstances.globalInc = new Chart(ctxGlobalInc, {
        type: 'doughnut',
        data: {
            labels: dashboardData.global.charts.incidentDistribution.labels,
            datasets: [{
                data: dashboardData.global.charts.incidentDistribution.data,
                backgroundColor: [blue, orange, purple, red, '#475569'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // 3. Financial: Rev vs Cost
    const ctxFinRevCost = document.getElementById('financialRevCostChart').getContext('2d');
    chartInstances.finRevCost = new Chart(ctxFinRevCost, {
        type: 'bar',
        data: {
            labels: dashboardData.financial.charts.revVsCost.labels,
            datasets: [
                {
                    label: 'Revenus Loyers (k€)',
                    data: dashboardData.financial.charts.revVsCost.revenue,
                    backgroundColor: blue,
                    borderRadius: 4
                },
                {
                    label: 'OPEX (k€)',
                    data: dashboardData.financial.charts.revVsCost.costs,
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

    // 4. Financial: Cost Structure
    const ctxFinCost = document.getElementById('financialCostStructureChart').getContext('2d');
    chartInstances.finCost = new Chart(ctxFinCost, {
        type: 'pie',
        data: {
            labels: dashboardData.financial.charts.costStructure.labels,
            datasets: [{
                data: dashboardData.financial.charts.costStructure.data,
                backgroundColor: [blue, purple, orange, green, '#475569'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // 5. Commercial: Occupancy Trend
    const ctxComOcc = document.getElementById('commercialOccupancyChart').getContext('2d');
    chartInstances.comOcc = new Chart(ctxComOcc, {
        type: 'line',
        data: {
            labels: dashboardData.commercial.charts.occupancyTrend.labels,
            datasets: [{
                label: "Taux d'Occupation (%)",
                data: dashboardData.commercial.charts.occupancyTrend.data,
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

    // 6. Commercial: Lease Expirations
    const ctxComLease = document.getElementById('commercialLeaseChart').getContext('2d');
    chartInstances.comLease = new Chart(ctxComLease, {
        type: 'bar',
        data: {
            labels: dashboardData.commercial.charts.leaseExpirations.labels,
            datasets: [{
                label: 'Baux Expirants',
                data: dashboardData.commercial.charts.leaseExpirations.data,
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

    // 7. Operational: Resolution Time
    const ctxOpRes = document.getElementById('operationalResolutionChart').getContext('2d');
    chartInstances.opRes = new Chart(ctxOpRes, {
        type: 'line',
        data: {
            labels: dashboardData.operational.charts.resolutionTimeTrend.labels,
            datasets: [
                {
                    label: 'Actuel (Jours)',
                    data: dashboardData.operational.charts.resolutionTimeTrend.actual,
                    borderColor: blue,
                    backgroundColor: blue,
                    borderWidth: 3,
                    tension: 0.4
                },
                {
                    label: 'Objectif (Jours)',
                    data: dashboardData.operational.charts.resolutionTimeTrend.target,
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

    // 8. Operational: Requests by Category
    const ctxOpReq = document.getElementById('operationalRequestsChart').getContext('2d');
    chartInstances.opReq = new Chart(ctxOpReq, {
        type: 'bar',
        data: {
            labels: dashboardData.operational.charts.requestsByCategory.labels,
            datasets: [{
                label: 'Nombre de Demandes',
                data: dashboardData.operational.charts.requestsByCategory.data,
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

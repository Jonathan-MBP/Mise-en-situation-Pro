#!/usr/bin/env node
/**
 * Dashboard Dirigeants — Frontend JavaScript with Map Integration
 * Manages all views (Global, Financial, Commercial, Operational, Map)
 * Integrates with FastAPI backend at http://localhost:8000
 */

const API_BASE = 'http://localhost:8000';

// ============================================================================
// DATA STORAGE
// ============================================================================

let allData = {
    global: null,
    financial: null,
    commercial: null,
    operational: null,
    map: null
};

let charts = {};
let mapInstance = null;
let buildingMarkers = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Dashboard Dirigeants — Initializing...');
    
    initNavigation();
    loadAllData();
    setupRefreshButton();
});

// ============================================================================
// NAVIGATION
// ============================================================================

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const viewName = item.dataset.view;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update active section
            switchView(viewName);
        });
    });
}

function switchView(viewName) {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(section => section.classList.add('hidden'));
    
    const activeSection = document.getElementById(`view-${viewName}`);
    if (activeSection) {
        activeSection.classList.remove('hidden');
        
        // Update header title
        const titles = {
            global: 'Vue Globale',
            financial: 'Vue Financière',
            commercial: 'Vue Commerciale',
            operational: 'Vue Opérationnelle',
            map: 'Carte des Immeubles'
        };
        
        document.getElementById('view-title').textContent = titles[viewName] || 'Dashboard';
        
        // Initialize map when switching to map view
        if (viewName === 'map' && !mapInstance) {
            setTimeout(() => initializeMap(), 100);
        }
    }
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadAllData() {
    console.log('📥 Loading data from API...');
    
    try {
        // Load all endpoints in parallel
        const [
            globalSummary,
            globalRevenueExpense,
            globalIncidents,
            financialMonthly,
            financialCost,
            financialDeposits,
            commercialOccupancy,
            commercialTrend,
            commercialExpirations,
            commercialTurnover,
            operationalMaintenance,
            operationalOpen,
            operationalResolution,
            operationalCategory,
            operationalIncidents,
            mapData
        ] = await Promise.all([
            fetch(`${API_BASE}/api/global/summary`).then(r => r.json()),
            fetch(`${API_BASE}/api/global/revenue-expense`).then(r => r.json()),
            fetch(`${API_BASE}/api/global/incident-distribution`).then(r => r.json()),
            fetch(`${API_BASE}/api/financial/monthly-summary`).then(r => r.json()),
            fetch(`${API_BASE}/api/financial/cost-structure`).then(r => r.json()),
            fetch(`${API_BASE}/api/financial/deposits`).then(r => r.json()),
            fetch(`${API_BASE}/api/commercial/occupancy-by-building`).then(r => r.json()),
            fetch(`${API_BASE}/api/commercial/occupancy-trend`).then(r => r.json()),
            fetch(`${API_BASE}/api/commercial/lease-expirations`).then(r => r.json()),
            fetch(`${API_BASE}/api/commercial/turnover-rate`).then(r => r.json()),
            fetch(`${API_BASE}/api/operational/maintenance-summary`).then(r => r.json()),
            fetch(`${API_BASE}/api/operational/open-requests`).then(r => r.json()),
            fetch(`${API_BASE}/api/operational/resolution-time-trend`).then(r => r.json()),
            fetch(`${API_BASE}/api/operational/requests-by-category`).then(r => r.json()),
            fetch(`${API_BASE}/api/operational/incidents-summary`).then(r => r.json()),
            fetch(`${API_BASE}/api/buildings/map`).then(r => r.json())
        ]);
        
        // Store data
        allData.global = {
            summary: globalSummary.data,
            revenueExpense: globalRevenueExpense.data,
            incidents: globalIncidents.data
        };
        
        allData.financial = {
            monthly: financialMonthly.data,
            cost: financialCost.data,
            deposits: financialDeposits.data
        };
        
        allData.commercial = {
            occupancy: commercialOccupancy.data,
            trend: commercialTrend.data,
            expirations: commercialExpirations.data,
            turnover: commercialTurnover.data
        };
        
        allData.operational = {
            maintenance: operationalMaintenance.data,
            open: operationalOpen.data,
            resolution: operationalResolution.data,
            category: operationalCategory.data,
            incidents: operationalIncidents.data
        };
        
        allData.map = mapData.data;
        
        console.log('✅ Data loaded successfully');
        console.log(allData);
        
        // Populate all views
        populateGlobalView();
        populateFinancialView();
        populateCommercialView();
        populateOperationalView();
        
        // Update timestamp
        updateTimestamp();
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        alert('Erreur : Impossible de charger les données. Vérifiez que l\'API est accessible à http://localhost:8000');
    }
}

// ============================================================================
// VIEW POPULATION — GLOBAL
// ============================================================================

function populateGlobalView() {
    const data = allData.global;
    
    // KPIs
    document.getElementById('kpi-global-revenue').textContent = 
        formatCurrency(data.summary.annual_revenue);
    document.getElementById('kpi-global-occupancy').textContent = 
        data.summary.occupancy_rate.toFixed(1) + ' %';
    document.getElementById('kpi-global-requests').textContent = 
        data.summary.open_requests;
    document.getElementById('kpi-global-incidents').textContent = 
        data.summary.critical_incidents;
    
    // Charts
    if (data.revenueExpense && data.revenueExpense.length > 0) {
        createRevenueExpenseChart(data.revenueExpense);
    }
    
    if (data.incidents && data.incidents.length > 0) {
        createIncidentDistributionChart(data.incidents);
    }
}

function createRevenueExpenseChart(data) {
    const ctx = document.getElementById('chart-revenue-expense').getContext('2d');
    
    if (charts['revenue-expense']) {
        charts['revenue-expense'].destroy();
    }
    
    const reversedData = [...data].reverse();
    
    charts['revenue-expense'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: reversedData.map(d => d.period),
            datasets: [
                {
                    label: 'Revenus',
                    data: reversedData.map(d => d.revenue),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Dépenses',
                    data: reversedData.map(d => d.expenses),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function createIncidentDistributionChart(data) {
    const ctx = document.getElementById('chart-incident-distribution').getContext('2d');
    
    if (charts['incident-distribution']) {
        charts['incident-distribution'].destroy();
    }
    
    const colors = {
        'Flood': '#3b82f6',
        'Fire': '#ef4444',
        'Leak': '#f59e0b',
        'Electrical': '#8b5cf6',
        'Structural': '#ec4899'
    };
    
    charts['incident-distribution'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => `${d.type} (${d.severity})`),
            datasets: [{
                data: data.map(d => 1),
                backgroundColor: data.map(d => colors[d.type] || '#6b7280')
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } }
        }
    });
}

// ============================================================================
// VIEW POPULATION — FINANCIAL
// ============================================================================

function populateFinancialView() {
    const data = allData.financial;
    
    if (data.monthly && data.monthly.length > 0) {
        const latest = data.monthly[0];
        
        document.getElementById('kpi-fin-revenue').textContent = 
            formatCurrency(latest.rent_collected);
        document.getElementById('kpi-fin-collection').textContent = 
            latest.collection_rate.toFixed(1) + ' %';
        document.getElementById('kpi-fin-opex').textContent = 
            formatCurrency(latest.operating_expenses);
        document.getElementById('kpi-fin-margin').textContent = 
            formatCurrency(latest.net_margin);
    }
    
    if (data.deposits && typeof data.deposits === 'object') {
        // deposits is already an object, not an array
    }
    
    if (data.monthly && data.monthly.length > 0) {
        createMonthlySummaryChart(data.monthly);
    }
    
    if (data.cost && data.cost.length > 0) {
        createCostStructureChart(data.cost);
    }
}

function createMonthlySummaryChart(data) {
    const ctx = document.getElementById('chart-monthly-summary').getContext('2d');
    
    if (charts['monthly-summary']) {
        charts['monthly-summary'].destroy();
    }
    
    const reversedData = [...data].reverse();
    
    charts['monthly-summary'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: reversedData.map(d => d.period),
            datasets: [
                {
                    label: 'Revenu Collecté',
                    data: reversedData.map(d => d.rent_collected),
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Dépenses',
                    data: reversedData.map(d => d.operating_expenses),
                    backgroundColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function createCostStructureChart(data) {
    const ctx = document.getElementById('chart-cost-structure').getContext('2d');
    
    if (charts['cost-structure']) {
        charts['cost-structure'].destroy();
    }
    
    const colors = {
        'Maintenance': '#3b82f6',
        'Utility': '#f59e0b',
        'Tax': '#ef4444'
    };
    
    charts['cost-structure'] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(d => d.type),
            datasets: [{
                data: data.map(d => d.total_amount),
                backgroundColor: data.map(d => colors[d.type] || '#6b7280')
            }]
        },
        options: { responsive: true }
    });
}

// ============================================================================
// VIEW POPULATION — COMMERCIAL
// ============================================================================

function populateCommercialView() {
    const data = allData.commercial;
    
    if (data.occupancy && data.occupancy.length > 0) {
        const avgOccupancy = data.occupancy.reduce((sum, d) => sum + d.occupancy_rate, 0) / data.occupancy.length;
        document.getElementById('kpi-comm-occupancy').textContent = 
            avgOccupancy.toFixed(1) + ' %';
        
        createOccupancyByBuildingChart(data.occupancy);
    }
    
    if (data.expirations && data.expirations.length > 0) {
        const totalExpirations = data.expirations.reduce((sum, d) => sum + d.expirations, 0);
        document.getElementById('kpi-comm-expirations').textContent = totalExpirations;
    }
    
    if (data.turnover && typeof data.turnover === 'object') {
        document.getElementById('kpi-comm-turnover').textContent = 
            data.turnover.turnover_rate.toFixed(1) + ' %';
    }
    
    if (data.trend && data.trend.length > 0) {
        createOccupancyTrendChart(data.trend);
    }
}

function createOccupancyByBuildingChart(data) {
    const ctx = document.getElementById('chart-occupancy-building').getContext('2d');
    
    if (charts['occupancy-building']) {
        charts['occupancy-building'].destroy();
    }
    
    charts['occupancy-building'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.slice(0, 15).map(d => d.building_name),
            datasets: [{
                label: 'Taux Occupation',
                data: data.slice(0, 15).map(d => d.occupancy_rate),
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: { x: { beginAtZero: true, max: 100 } }
        }
    });
}

function createOccupancyTrendChart(data) {
    const ctx = document.getElementById('chart-occupancy-trend').getContext('2d');
    
    if (charts['occupancy-trend']) {
        charts['occupancy-trend'].destroy();
    }
    
    const reversedData = [...data].reverse();
    
    charts['occupancy-trend'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: reversedData.map(d => d.period),
            datasets: [{
                label: 'Taux Occupation',
                data: reversedData.map(d => (d.occupied / d.total_leases * 100).toFixed(1)),
                borderColor: '#10b981',
                tension: 0.4,
                fill: false
            }]
        },
        options: { responsive: true }
    });
}

// ============================================================================
// VIEW POPULATION — OPERATIONAL
// ============================================================================

function populateOperationalView() {
    const data = allData.operational;
    
    if (data.maintenance && typeof data.maintenance === 'object') {
        document.getElementById('kpi-op-resolution').textContent = 
            data.maintenance.avg_resolution_days.toFixed(1) + ' j';
        document.getElementById('kpi-op-open').textContent = 
            'N/A'; // Would need separate count
        document.getElementById('kpi-op-avgcost').textContent = 
            formatCurrency(data.maintenance.avg_cost);
    }
    
    if (data.category && data.category.length > 0) {
        createRequestsByCategoryChart(data.category);
    }
    
    if (data.resolution && data.resolution.length > 0) {
        createResolutionTrendChart(data.resolution);
    }
}

function createRequestsByCategoryChart(data) {
    const ctx = document.getElementById('chart-requests-category').getContext('2d');
    
    if (charts['requests-category']) {
        charts['requests-category'].destroy();
    }
    
    const colors = {
        'Plumbing': '#3b82f6',
        'Electrical': '#8b5cf6',
        'HVAC': '#f59e0b',
        'General': '#10b981'
    };
    
    charts['requests-category'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.category),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: data.map(d => colors[d.category] || '#6b7280')
            }]
        },
        options: { responsive: true }
    });
}

function createResolutionTrendChart(data) {
    const ctx = document.getElementById('chart-resolution-trend').getContext('2d');
    
    if (charts['resolution-trend']) {
        charts['resolution-trend'].destroy();
    }
    
    const reversedData = [...data].reverse();
    
    charts['resolution-trend'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: reversedData.map(d => d.period),
            datasets: [
                {
                    label: 'Délai Réel',
                    data: reversedData.map(d => d.avg_resolution_days),
                    borderColor: '#ef4444',
                    tension: 0.4
                },
                {
                    label: 'Cible (3j)',
                    data: Array(reversedData.length).fill(3),
                    borderColor: '#10b981',
                    borderDash: [5, 5],
                    tension: 0
                }
            ]
        },
        options: { responsive: true }
    });
}

// ============================================================================
// MAP VIEW — LEAFLET.JS INTEGRATION
// ============================================================================

function initializeMap() {
    if (!allData.map || allData.map.length === 0) {
        console.warn('⚠️ No map data available');
        return;
    }
    
    console.log('🗺️ Initializing Leaflet map...');
    
    // Get bounds from data
    const bounds = allData.map;
    const centerLat = (Math.max(...bounds.map(b => b.latitude)) + Math.min(...bounds.map(b => b.latitude))) / 2;
    const centerLon = (Math.max(...bounds.map(b => b.longitude)) + Math.min(...bounds.map(b => b.longitude))) / 2;
    
    // Initialize map
    mapInstance = L.map('leaflet-map').setView([centerLat, centerLon], 12);
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(mapInstance);
    
    // Add building markers
    allData.map.forEach(building => {
        const color = getMarkerColor(building.occupancy_rate);
        
        const marker = L.circleMarker([building.latitude, building.longitude], {
            radius: 8,
            fillColor: color,
            color: '#000',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.7
        });
        
        // Popup with building info
        marker.bindPopup(`
            <div class="building-popup">
                <strong>${building.name}</strong><br>
                ${building.address}<br>
                ${building.postal_code} ${building.city}<br>
                Arrondissement: ${building.arrondissement_name}<br>
                <br>
                Occupation: ${building.occupancy_rate.toFixed(1)}% (${building.occupied_units}/${building.total_units})<br>
                Loyer moyen: ${formatCurrency(building.monthly_rent)}
            </div>
        `);
        
        marker.addTo(mapInstance);
        buildingMarkers.push(marker);
    });
    
    console.log('✅ Map initialized with', buildingMarkers.length, 'buildings');
}

function getMarkerColor(occupancyRate) {
    if (occupancyRate >= 80) return '#10b981'; // Green
    if (occupancyRate >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatCurrency(value) {
    if (!value) return '0 €';
    
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + ' M€';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + ' k€';
    } else {
        return value.toFixed(0) + ' €';
    }
}

function updateTimestamp() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR');
    document.getElementById('last-update').textContent = `Mis à jour : ${timeStr}`;
}

function setupRefreshButton() {
    document.getElementById('btn-refresh').addEventListener('click', () => {
        console.log('🔄 Refreshing data...');
        location.reload();
    });
}

console.log('✅ Dashboard JavaScript loaded');

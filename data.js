// Mock Data for the Property Management Dashboard

const dashboardData = {
    global: {
        kpi: {
            revenue: "3.2M €",
            occupancy: "85.5%",
            openRequests: "12",
            criticalIncidents: "3"
        },
        charts: {
            revenueExpense: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
                revenue: [260, 265, 270, 268, 275, 272, 280, 278, 285, 290, 288, 295],
                expense: [85, 90, 80, 110, 85, 95, 100, 85, 90, 105, 80, 95] 
            },
            incidentDistribution: {
                labels: ['Plomberie', 'Électricité', 'CVC', 'Structure', 'Autre'],
                data: [40, 25, 15, 10, 10]
            }
        }
    },
    financial: {
        kpi: {
            rentRevenue: "3.2M €",
            collectionRate: "97.2%",
            operatingExpenses: "1.1M €",
            netMargin: "2.1M €",
            activeDeposits: "320k €"
        },
        charts: {
            revVsCost: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                revenue: [795, 815, 843, 873],
                costs: [255, 290, 280, 280]
            },
            costStructure: {
                labels: ['Maintenance', 'Services Publics', 'Taxes', 'Assurances', 'Gestion'],
                data: [35, 20, 25, 10, 10]
            }
        }
    },
    commercial: {
        kpi: {
            occupancyRate: "85.5%",
            avgLeaseDelay: "18 jrs",
            depositsCollected: "35k €",
            tenantTurnover: "45"
        },
        charts: {
            occupancyTrend: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                data: [82.5, 83.0, 84.1, 84.5, 85.0, 85.5]
            },
            leaseExpirations: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4', '2027+'],
                data: [15, 25, 40, 30, 290]
            }
        }
    },
    operational: {
        kpi: {
            avgResolutionTime: "3.5 jrs",
            openRequests: "12",
            avgMaintenanceCost: "450 €",
            criticalIncidents: "3 (85k€)"
        },
        charts: {
            resolutionTimeTrend: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                actual: [4.2, 4.0, 3.8, 3.5, 3.6, 3.5],
                target: [3.0, 3.0, 3.0, 3.0, 3.0, 3.0]
            },
            requestsByCategory: {
                labels: ['Plomberie', 'Électricité', 'CVC', 'Structure', 'Autre'],
                data: [45, 30, 20, 15, 10]
            }
        }
    }
};

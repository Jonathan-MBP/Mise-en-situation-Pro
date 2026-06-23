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
let mapTileLayer = null;
let buildingMarkers = [];
let lastUpdateTime = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Dashboard Dirigeants — Initializing...');
    
    initTheme();
    initLanguage();
    initNavigation();
    initMobileMenu();
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

function initMobileMenu() {
    const btnMenu = document.getElementById('btn-menu');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    if (btnMenu && sidebar && backdrop) {
        btnMenu.addEventListener('click', () => {
            sidebar.classList.add('open');
            backdrop.classList.add('active');
        });
        
        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('open');
            backdrop.classList.remove('active');
        });
    }
}

// ============================================================================
// THEME MANAGEMENT
// ============================================================================

function initTheme() {
    const savedTheme = localStorage.getItem('dashboard-theme');
    const isLight = savedTheme === 'light';
    
    if (isLight) {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    
    updateThemeButton();
    updateChartDefaults();
    
    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
        btnTheme.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isNowLight = document.body.classList.contains('light-theme');
            localStorage.setItem('dashboard-theme', isNowLight ? 'light' : 'dark');
            
            updateThemeButton();
            updateChartDefaults();
            
            // Re-render charts with new theme colors
            if (allData.global) {
                populateGlobalView();
                populateFinancialView();
                populateCommercialView();
                populateOperationalView();
            }
            
            // Update map theme if map exists
            updateMapTheme();
        });
    }
}

function updateThemeButton() {
    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
        const isLight = document.body.classList.contains('light-theme');
        btnTheme.textContent = isLight ? '🌙' : '☀️';
    }
}

function updateChartDefaults() {
    const isLight = document.body.classList.contains('light-theme');
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = isLight ? '#64748b' : '#94a3b8';
        Chart.defaults.borderColor = isLight ? '#e2e8f0' : '#334155';
    }
}

function updateMapTheme() {
    if (mapInstance && mapTileLayer) {
        mapInstance.removeLayer(mapTileLayer);
        const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            
        mapTileLayer = L.tileLayer(tileUrl, {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(mapInstance);
    }
}

// ============================================================================
// LANGUAGE MANAGEMENT (i18n)
// ============================================================================

const TRANSLATIONS = {
    fr: {
        "logo-subtitle": "Dirigeants",
        "nav-global": "Vue Globale",
        "nav-financial": "Finance",
        "nav-commercial": "Commercial",
        "nav-operational": "Opérationnel",
        "nav-map": "Carte",
        "team-label": "Équipe",
        "btn-refresh": "Rafraîchir",
        "kpi-revenue": "Revenus Annuels",
        "kpi-occupancy": "Taux d'Occupation",
        "kpi-requests": "Demandes Ouvertes",
        "kpi-incidents": "Incidents Critiques",
        "trend-revenue-prev": "+2.5% vs. année précédente",
        "trend-occupancy-target": "En ligne avec cible (85%)",
        "trend-requests-delay": "Délai moyen : 3.5 jours",
        "trend-incidents-impact": "Aucun impact sur l'occupation",
        "chart-rev-exp": "Revenus vs Dépenses (12 mois)",
        "chart-inc-type": "Incidents par Type",
        "kpi-fin-rent": "Revenu Loyers",
        "kpi-fin-collection": "Taux Collecte",
        "kpi-fin-opex": "Dépenses OpEx",
        "kpi-fin-margin": "Marge Nette",
        "trend-this-month-1": "Ce mois",
        "trend-target-98": "Cible : 98%",
        "trend-this-month-2": "Ce mois",
        "trend-margin-profit": "Rentabilité",
        "chart-fin-monthly": "Résumé Mensuel (12 mois)",
        "chart-fin-cost": "Structure des Coûts",
        "kpi-comm-occ-global": "Taux Occupation Global",
        "kpi-comm-exp": "Baux Expirants",
        "kpi-comm-dep": "Dépôts Collectés",
        "kpi-comm-rot": "Rotation Annuelle",
        "trend-comm-health": "Santé du portefeuille",
        "trend-comm-months": "Prochains mois",
        "trend-comm-guarantees": "Garanties actives",
        "trend-comm-stability": "Stabilité locataires",
        "chart-comm-building": "Occupation par Immeuble",
        "chart-comm-trend": "Tendance Occupation (6 mois)",
        "kpi-op-res": "Délai Résolution Moyen",
        "kpi-op-open": "Demandes Ouvertes",
        "kpi-op-cost": "Coût Moyen",
        "kpi-op-inc": "Incidents Critiques",
        "trend-op-target": "Cible : 3 jours",
        "trend-op-progress": "En cours",
        "trend-op-request": "Par demande",
        "trend-op-monitor": "À surveiller",
        "chart-op-res-target": "Délai Résolution vs Cible",
        "chart-op-req-cat": "Demandes par Catégorie",
        "map-title": "Localisation des Immeubles",
        "map-desc": "Cliquez sur les marqueurs pour voir les détails",
        "map-occ-high": "Occupation forte (>80%)",
        "map-occ-med": "Occupation moyenne (50-80%)",
        "map-occ-low": "Occupation faible (<50%)",
        "chart-rev-label": "Revenus",
        "chart-exp-label": "Dépenses",
        "chart-col-label": "Revenu Collecté",
        "chart-occ-label": "Taux Occupation",
        "chart-res-label": "Délai Réel",
        "chart-target-label": "Cible (3j)",
        "map-arr": "Arrondissement",
        "map-occ": "Occupation",
        "map-rent": "Loyer moyen",
        "last-update-prefix": "Mis à jour :",
        "kpi-op-open-na": "N/A"
    },
    en: {
        "logo-subtitle": "Executives",
        "nav-global": "Global View",
        "nav-financial": "Finance",
        "nav-commercial": "Commercial",
        "nav-operational": "Operations",
        "nav-map": "Map",
        "team-label": "Team",
        "btn-refresh": "Refresh",
        "kpi-revenue": "Annual Revenue",
        "kpi-occupancy": "Occupancy Rate",
        "kpi-requests": "Open Requests",
        "kpi-incidents": "Critical Incidents",
        "trend-revenue-prev": "+2.5% vs. last year",
        "trend-occupancy-target": "In line with target (85%)",
        "trend-requests-delay": "Avg delay: 3.5 days",
        "trend-incidents-impact": "No impact on occupancy",
        "chart-rev-exp": "Revenue vs Expenses (12 months)",
        "chart-inc-type": "Incidents by Type",
        "kpi-fin-rent": "Rent Income",
        "kpi-fin-collection": "Collection Rate",
        "kpi-fin-opex": "OpEx Expenses",
        "kpi-fin-margin": "Net Margin",
        "trend-this-month-1": "This month",
        "trend-target-98": "Target: 98%",
        "trend-this-month-2": "This month",
        "trend-margin-profit": "Profitability",
        "chart-fin-monthly": "Monthly Summary (12 months)",
        "chart-fin-cost": "Cost Structure",
        "kpi-comm-occ-global": "Overall Occupancy Rate",
        "kpi-comm-exp": "Expiring Leases",
        "kpi-comm-dep": "Deposits Held",
        "kpi-comm-rot": "Annual Turnover",
        "trend-comm-health": "Portfolio health",
        "trend-comm-months": "Upcoming months",
        "trend-comm-guarantees": "Active guarantees",
        "trend-comm-stability": "Tenant stability",
        "chart-comm-building": "Occupancy by Building",
        "chart-comm-trend": "Occupancy Trend (6 months)",
        "kpi-op-res": "Avg Resolution Time",
        "kpi-op-open": "Open Requests",
        "kpi-op-cost": "Average Cost",
        "kpi-op-inc": "Critical Incidents",
        "trend-op-target": "Target: 3 days",
        "trend-op-progress": "In progress",
        "trend-op-request": "Per request",
        "trend-op-monitor": "To monitor",
        "chart-op-res-target": "Resolution Time vs Target",
        "chart-op-req-cat": "Requests by Category",
        "map-title": "Location of Buildings",
        "map-desc": "Click on markers to view details",
        "map-occ-high": "High occupancy (>80%)",
        "map-occ-med": "Medium occupancy (50-80%)",
        "map-occ-low": "Low occupancy (<50%)",
        "chart-rev-label": "Revenue",
        "chart-exp-label": "Expenses",
        "chart-col-label": "Collected Rent",
        "chart-occ-label": "Occupancy Rate",
        "chart-res-label": "Actual Delay",
        "chart-target-label": "Target (3d)",
        "map-arr": "District",
        "map-occ": "Occupancy",
        "map-rent": "Avg rent",
        "last-update-prefix": "Updated:",
        "kpi-op-open-na": "N/A"
    },
    ja: {
        "logo-subtitle": "経営幹部",
        "nav-global": "全体概要",
        "nav-financial": "財務分析",
        "nav-commercial": "商業分析",
        "nav-operational": "業務分析",
        "nav-map": "マップ",
        "team-label": "チーム",
        "btn-refresh": "更新",
        "kpi-revenue": "年間収益",
        "kpi-occupancy": "入居率",
        "kpi-requests": "未対応案件",
        "kpi-incidents": "重大インシデント",
        "trend-revenue-prev": "前年比 +2.5%",
        "trend-occupancy-target": "目標値 (85%) 通り",
        "trend-requests-delay": "平均期間 : 3.5 日",
        "trend-incidents-impact": "入居率への影響なし",
        "chart-rev-exp": "収益 vs 支出 (12ヶ月)",
        "chart-inc-type": "インシデントタイプ別",
        "kpi-fin-rent": "家賃収入",
        "kpi-fin-collection": "回収率",
        "kpi-fin-opex": "運営費 (OpEx)",
        "kpi-fin-margin": "純利益",
        "trend-this-month-1": "今月",
        "trend-target-98": "目標 : 98%",
        "trend-this-month-2": "今月",
        "trend-margin-profit": "収益性",
        "chart-fin-monthly": "月次集計 (12ヶ月)",
        "chart-fin-cost": "コスト構造",
        "kpi-comm-occ-global": "総合入居率",
        "kpi-comm-exp": "期限終了間近の契約",
        "kpi-comm-dep": "預り保証金",
        "kpi-comm-rot": "年間入替率",
        "trend-comm-health": "ポートフォリオ状況",
        "trend-comm-months": "今後数ヶ月",
        "trend-comm-guarantees": "有効な保証",
        "trend-comm-stability": "入居者安定性",
        "chart-comm-building": "ビル別入居率",
        "chart-comm-trend": "入居率推移 (6ヶ月)",
        "kpi-op-res": "平均対応期間",
        "kpi-op-open": "未対応案件",
        "kpi-op-cost": "平均費用",
        "kpi-op-inc": "重大インシデント",
        "trend-op-target": "目標 : 3 日",
        "trend-op-progress": "進行中",
        "trend-op-request": "案件ごと",
        "trend-op-monitor": "要監視",
        "chart-op-res-target": "対応期間 vs 目標",
        "chart-op-req-cat": "カテゴリ別要求件数",
        "map-title": "物件の所在地",
        "map-desc": "マーカーをクリックして詳細を表示",
        "map-occ-high": "高入居率 (>80%)",
        "map-occ-med": "中入居率 (50-80%)",
        "map-occ-low": "低入居率 (<50%)",
        "chart-rev-label": "収益",
        "chart-exp-label": "支出",
        "chart-col-label": "回収家賃",
        "chart-occ-label": "入居率",
        "chart-res-label": "実際の期間",
        "chart-target-label": "目標 (3日)",
        "map-arr": "区",
        "map-occ": "入居率",
        "map-rent": "平均賃料",
        "last-update-prefix": "最終更新 :",
        "kpi-op-open-na": "なし"
    },
    ar: {
        "logo-subtitle": "المدراء التنفيذيون",
        "nav-global": "العرض العام",
        "nav-financial": "المالية",
        "nav-commercial": "التجاري",
        "nav-operational": "التشغيلي",
        "nav-map": "الخريطة",
        "team-label": "الفريق",
        "btn-refresh": "تحديث",
        "kpi-revenue": "الإيرادات السنوية",
        "kpi-occupancy": "معدل الإشغال",
        "kpi-requests": "الطلبات المفتوحة",
        "kpi-incidents": "الحوادث الحرجة",
        "trend-revenue-prev": "+2.5% مقارنة بالعام الماضي",
        "trend-occupancy-target": "متوافق مع الهدف (85%)",
        "trend-requests-delay": "متوسط التأخير: 3.5 أيام",
        "trend-incidents-impact": "لا يوجد تأثير على الإشغال",
        "chart-rev-exp": "الإيرادات مقابل المصروفات (12 شهرًا)",
        "chart-inc-type": "الحوادث حسب النوع",
        "kpi-fin-rent": "إيرادات الإيجار",
        "kpi-fin-collection": "معدل التحصيل",
        "kpi-fin-opex": "النفقات التشغيلية",
        "kpi-fin-margin": "صافي الهامش",
        "trend-this-month-1": "هذا الشهر",
        "trend-target-98": "الهدف: 98%",
        "trend-this-month-2": "هذا الشهر",
        "trend-margin-profit": "الربحية",
        "chart-fin-monthly": "الملخص الشهري (12 شهرًا)",
        "chart-fin-cost": "هيكل التكلفة",
        "kpi-comm-occ-global": "معدل الإشغال العام",
        "kpi-comm-exp": "العقود المنتهية قريباً",
        "kpi-comm-dep": "الودائع المحتجزة",
        "kpi-comm-rot": "معدل الدوران السنوي",
        "trend-comm-health": "صحة المحفظة العقارية",
        "trend-comm-months": "الأشهر القادمة",
        "trend-comm-guarantees": "الضمانات النشطة",
        "trend-comm-stability": "استقرار المستأجرين",
        "chart-comm-building": "الإشغال حسب المبنى",
        "chart-comm-trend": "اتجاه الإشغال (6 أشهر)",
        "kpi-op-res": "متوسط وقت الحل",
        "kpi-op-open": "الطلبات المفتوحة",
        "kpi-op-cost": "متوسط التكلفة",
        "kpi-op-inc": "الحوادث الحرجة",
        "trend-op-target": "الهدف: 3 أيام",
        "trend-op-progress": "قيد التنفيذ",
        "trend-op-request": "لكل طلب",
        "trend-op-monitor": "للمراقبة",
        "chart-op-res-target": "وقت الحل مقابل الهدف",
        "chart-op-req-cat": "الطلبات حسب الفئة",
        "map-title": "مواقع المباني",
        "map-desc": "انقر فوق العلامات لعرض التفاصيل",
        "map-occ-high": "إشغال مرتفع (>80%)",
        "map-occ-med": "إشغال متوسط (50-80%)",
        "map-occ-low": "إشغال منخفض (<50%)",
        "chart-rev-label": "الإيرادات",
        "chart-exp-label": "المصروفات",
        "chart-col-label": "الإيجار المحصل",
        "chart-occ-label": "معدل الإشغال",
        "chart-res-label": "التأخير الفعلي",
        "chart-target-label": "الهدف (3 أيام)",
        "map-arr": "المنطقة",
        "map-occ": "الإشغال",
        "map-rent": "متوسط الإيجار",
        "last-update-prefix": "تم التحديث:",
        "kpi-op-open-na": "غير متوفر"
    },
    ru: {
        "logo-subtitle": "Руководство",
        "nav-global": "Общий обзор",
        "nav-financial": "Финансы",
        "nav-commercial": "Коммерция",
        "nav-operational": "Операции",
        "nav-map": "Карта",
        "team-label": "Команда",
        "btn-refresh": "Обновить",
        "kpi-revenue": "Годовой доход",
        "kpi-occupancy": "Уровень занятости",
        "kpi-requests": "Открытые заявки",
        "kpi-incidents": "Критические инциденты",
        "trend-revenue-prev": "+2.5% по сравнению с прошлым годом",
        "trend-occupancy-target": "Соответствует цели (85%)",
        "trend-requests-delay": "Средний срок: 3.5 дня",
        "trend-incidents-impact": "Нет влияния на занятость",
        "chart-rev-exp": "Доходы и расходы (12 месяцев)",
        "chart-inc-type": "Инциденты по типам",
        "kpi-fin-rent": "Доход от аренды",
        "kpi-fin-collection": "Уровень сборов",
        "kpi-fin-opex": "Операционные расходы",
        "trend-this-month-2": "В этом месяце",
        "trend-margin-profit": "Рентабельность",
        "chart-fin-monthly": "Ежемесячный отчет (12 месяцев)",
        "chart-fin-cost": "Структура затрат",
        "kpi-comm-occ-global": "Общий уровень занятости",
        "kpi-comm-exp": "Истекающие договоры",
        "kpi-comm-dep": "Депозиты в наличии",
        "kpi-comm-rot": "Годовая ротация",
        "trend-comm-health": "Состояние портфеля",
        "trend-comm-months": "Ближайшие месяцы",
        "trend-comm-guarantees": "Активные гарантии",
        "trend-comm-stability": "Стабильность арендаторов",
        "chart-comm-building": "Занятость по зданиям",
        "chart-comm-trend": "Динамика занятости (6 месяцев)",
        "kpi-op-res": "Ср. время разрешения",
        "kpi-op-open": "Открытые заявки",
        "kpi-op-cost": "Средняя стоимость",
        "kpi-op-inc": "Критические инциденты",
        "trend-op-target": "Цель: 3 дня",
        "trend-op-progress": "В процессе",
        "trend-op-request": "За заявку",
        "trend-op-monitor": "Контроль",
        "chart-op-res-target": "Время разрешения vs Цель",
        "chart-op-req-cat": "Заявки по категориям",
        "map-title": "Расположение зданий",
        "map-desc": "Нажмите на маркер, чтобы увидеть детали",
        "map-occ-high": "Высокая занятость (>80%)",
        "map-occ-med": "Средняя занятость (50-80%)",
        "map-occ-low": "Низкая занятость (<50%)",
        "chart-rev-label": "Доход",
        "chart-exp-label": "Расходы",
        "chart-col-label": "Собранная аренда",
        "chart-occ-label": "Уровень занятости",
        "chart-res-label": "Фактический срок",
        "chart-target-label": "Цель (3д)",
        "map-arr": "Округ",
        "map-occ": "Занятость",
        "map-rent": "Ср. аренда",
        "last-update-prefix": "Обновлено:",
        "kpi-op-open-na": "Н/Д"
    }
};

const CHART_TRANSLATIONS = {
    fr: {
        'Flood': 'Inondation',
        'Fire': 'Incendie',
        'Leak': 'Fuite',
        'Electrical': 'Électricité',
        'Structural': 'Structure',
        'Accident': 'Accident',
        'Break_in': 'Effraction',
        'Critical': 'Critique',
        'Major': 'Majeur',
        'Moderate': 'Modéré',
        'Minor': 'Mineur',
        'High': 'Élevé',
        'Medium': 'Moyen',
        'Low': 'Faible',
        'Maintenance': 'Maintenance',
        'Utility': 'Fluides',
        'Tax': 'Taxes',
        'Plumbing': 'Plomberie',
        'HVAC': 'CVC',
        'General': 'Général',
        'Electric': 'Électricité',
        'Other': 'Autre'
    },
    en: {
        'Flood': 'Flood',
        'Fire': 'Fire',
        'Leak': 'Leak',
        'Electrical': 'Electrical',
        'Structural': 'Structural',
        'Accident': 'Accident',
        'Break_in': 'Break-in',
        'Critical': 'Critical',
        'Major': 'Major',
        'Moderate': 'Moderate',
        'Minor': 'Minor',
        'High': 'High',
        'Medium': 'Medium',
        'Low': 'Low',
        'Maintenance': 'Maintenance',
        'Utility': 'Utility',
        'Tax': 'Tax',
        'Plumbing': 'Plumbing',
        'HVAC': 'HVAC',
        'General': 'General',
        'Electric': 'Electrical',
        'Other': 'Other'
    },
    ja: {
        'Flood': '洪水',
        'Fire': '火災',
        'Leak': '漏水',
        'Electrical': '電気',
        'Structural': '構造',
        'Accident': '事故',
        'Break_in': '不法侵入',
        'Critical': '深刻',
        'Major': '重大',
        'Moderate': '中等度',
        'Minor': '軽微',
        'High': '高',
        'Medium': '中',
        'Low': '低',
        'Maintenance': 'メンテナンス',
        'Utility': '光熱費',
        'Tax': '税金',
        'Plumbing': '配管',
        'HVAC': '空調',
        'General': '一般',
        'Electric': '電気',
        'Other': 'その他'
    },
    ar: {
        'Flood': 'فيضان',
        'Fire': 'حريق',
        'Leak': 'تسريب',
        'Electrical': 'كهرباء',
        'Structural': 'هيكلي',
        'Accident': 'حادث',
        'Break_in': 'سطو',
        'Critical': 'حرجة',
        'Major': 'رئيسي',
        'Moderate': 'معتدل',
        'Minor': 'طفيف',
        'High': 'مرتفع',
        'Medium': 'متوسط',
        'Low': 'منخفض',
        'Maintenance': 'صيانة',
        'Utility': 'خدمات',
        'Tax': 'ضرائب',
        'Plumbing': 'سباكة',
        'HVAC': 'تكييف',
        'General': 'عام',
        'Electric': 'كهرباء',
        'Other': 'آخر'
    },
    ru: {
        'Flood': 'Наводнение',
        'Fire': 'Пожар',
        'Leak': 'Утечка',
        'Electrical': 'Электрика',
        'Structural': 'Структурный',
        'Accident': 'Несчастный случай',
        'Break_in': 'Взлом',
        'Critical': 'Критический',
        'Major': 'Серьезный',
        'Moderate': 'Умеренный',
        'Minor': 'Незначительный',
        'High': 'Высокий',
        'Medium': 'Средний',
        'Low': 'Низкий',
        'Maintenance': 'Обслуживание',
        'Utility': 'Коммунальные услуги',
        'Tax': 'Налоги',
        'Plumbing': 'Сантехника',
        'HVAC': 'Отопление и вентиляция',
        'General': 'Общий',
        'Electric': 'Электрика',
        'Other': 'Другое'
    }
};

function translateLabel(key, lang) {
    if (CHART_TRANSLATIONS[lang] && CHART_TRANSLATIONS[lang][key]) {
        return CHART_TRANSLATIONS[lang][key];
    }
    if (CHART_TRANSLATIONS['fr'] && CHART_TRANSLATIONS['fr'][key]) {
        return CHART_TRANSLATIONS['fr'][key];
    }
    return key;
}

function initLanguage() {
    const savedLang = localStorage.getItem('dashboard-lang') || 'fr';
    const selectLang = document.getElementById('select-lang');
    if (selectLang) {
        selectLang.value = savedLang;
        selectLang.addEventListener('change', (e) => {
            const newLang = e.target.value;
            localStorage.setItem('dashboard-lang', newLang);
            applyLanguage(newLang);
        });
    }
    applyLanguage(savedLang);
}

function getCurrentLanguage() {
    return localStorage.getItem('dashboard-lang') || 'fr';
}

function updateLanguageDirection(lang) {
    document.body.dir = 'ltr';
}

function applyLanguage(lang) {
    updateLanguageDirection(lang);
    
    // 1. Translate static text elements with [data-i18n]
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.dataset.i18n;
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
            el.textContent = TRANSLATIONS[lang][key];
        } else if (TRANSLATIONS['fr'] && TRANSLATIONS['fr'][key]) {
            el.textContent = TRANSLATIONS['fr'][key];
        }
    });
    
    // 2. Update the dynamic view title in header
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        const viewName = activeNav.dataset.view;
        const titles = {
            global: { fr: 'Vue Globale', en: 'Global View', ja: 'グローバル概要', ar: 'العرض العام', ru: 'Общий обзор' },
            financial: { fr: 'Vue Financière', en: 'Financial View', ja: '財務分析', ar: 'العرض المالي', ru: 'Финансовый обзор' },
            commercial: { fr: 'Vue Commerciale', en: 'Commercial View', ja: '商業分析', ar: 'العرض التجاري', ru: 'Коммерческий обзор' },
            operational: { fr: 'Vue Opérationnelle', en: 'Operational View', ja: '業務分析', ar: 'العرض التشغيلي', ru: 'Операционный обзор' },
            map: { fr: 'Carte des Immeubles', en: 'Map of Buildings', ja: '物件マップ', ar: 'خريطة العقارات', ru: 'Карта зданий' }
        };
        document.getElementById('view-title').textContent = titles[viewName]?.[lang] || titles[viewName]?.['fr'] || 'Dashboard';
    }
    
    // 3. Re-render charts to translate labels/legends
    if (allData.global) {
        populateGlobalView();
        populateFinancialView();
        populateCommercialView();
        populateOperationalView();
    }
    
    // 4. Reload map if initialized to update popups
    if (mapInstance && allData.map) {
        // Clear all markers and reload map to update popups language
        buildingMarkers.forEach(m => mapInstance.removeLayer(m));
        buildingMarkers = [];
        
        // Add building markers back with translated popups
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
            
            const labelArr = TRANSLATIONS[lang]["map-arr"];
            const labelOcc = TRANSLATIONS[lang]["map-occ"];
            const labelRent = TRANSLATIONS[lang]["map-rent"];
            
            marker.bindPopup(`
                <div class="building-popup">
                    <strong>${building.name}</strong><br>
                    ${building.address}<br>
                    ${building.postal_code} ${building.city}<br>
                    ${labelArr}: ${building.arrondissement_name}<br>
                    <br>
                    ${labelOcc}: ${building.occupancy_rate.toFixed(1)}% (${building.occupied_units}/${building.total_units})<br>
                    ${labelRent}: ${formatCurrency(building.monthly_rent)}
                </div>
            `);
            
            marker.addTo(mapInstance);
            buildingMarkers.push(marker);
        });
    }
    updateTimestamp();
}

function switchView(viewName) {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(section => section.classList.add('hidden'));
    
    const activeSection = document.getElementById(`view-${viewName}`);
    if (activeSection) {
        activeSection.classList.remove('hidden');
        
        // Update header title
        const lang = getCurrentLanguage();
        const titles = {
            global: { fr: 'Vue Globale', en: 'Global View', ja: 'グローバル概要', ar: 'العرض العام', ru: 'Общий обзор' },
            financial: { fr: 'Vue Financière', en: 'Financial View', ja: '財務分析', ar: 'العرض المالي', ru: 'Финансовый обзор' },
            commercial: { fr: 'Vue Commerciale', en: 'Commercial View', ja: '商業分析', ar: 'العرض التجاري', ru: 'Коммерческий обзор' },
            operational: { fr: 'Vue Opérationnelle', en: 'Operational View', ja: '業務分析', ar: 'العرض التشغيلي', ru: 'Операционный обзор' },
            map: { fr: 'Carte des Immeubles', en: 'Map of Buildings', ja: '物件マップ', ar: 'خريطة العقارات', ru: 'Карта зданий' }
        };
        
        document.getElementById('view-title').textContent = titles[viewName]?.[lang] || titles[viewName]?.['fr'] || 'Dashboard';
        
        // Close sidebar drawer on mobile
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar && backdrop) {
            sidebar.classList.remove('open');
            backdrop.classList.remove('active');
        }
        
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
        lastUpdateTime = new Date();
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
                    label: TRANSLATIONS[getCurrentLanguage()]["chart-rev-label"] || 'Revenus',
                    data: reversedData.map(d => d.revenue),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: TRANSLATIONS[getCurrentLanguage()]["chart-exp-label"] || 'Dépenses',
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
        'Electrical': '#5cf676ff',
        'Structural': '#ec4899',
        'Accident': '#8b5cf6',
        'Break_in': '#6b7280'
    };
    
    charts['incident-distribution'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => {
                const typeTrans = translateLabel(d.type, getCurrentLanguage());
                const sevTrans = translateLabel(d.severity, getCurrentLanguage());
                return `${typeTrans} (${sevTrans})`;
            }),
            datasets: [{
                data: data.map(d => d.count || 1),
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
                    label: TRANSLATIONS[getCurrentLanguage()]["chart-col-label"] || 'Revenu Collecté',
                    data: reversedData.map(d => d.rent_collected),
                    backgroundColor: '#10b981'
                },
                {
                    label: TRANSLATIONS[getCurrentLanguage()]["chart-exp-label"] || 'Dépenses',
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
            labels: data.map(d => translateLabel(d.type, getCurrentLanguage())),
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
    
    const financialData = allData.financial;
    if (financialData && financialData.deposits && typeof financialData.deposits === 'object') {
        document.getElementById('kpi-comm-deposits').textContent = 
            formatCurrency(financialData.deposits.total_held || 0);
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
                label: TRANSLATIONS[getCurrentLanguage()]["chart-occ-label"] || 'Taux Occupation',
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
                label: TRANSLATIONS[getCurrentLanguage()]["chart-occ-label"] || 'Taux Occupation',
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
        const daysLabel = getCurrentLanguage() === 'fr' ? ' j' : 
                          getCurrentLanguage() === 'ja' ? ' 日' :
                          getCurrentLanguage() === 'ar' ? ' يوم' :
                          getCurrentLanguage() === 'ru' ? ' д.' : ' d';
        document.getElementById('kpi-op-resolution').textContent = 
            data.maintenance.avg_resolution_days.toFixed(1) + daysLabel;
        const openNa = TRANSLATIONS[getCurrentLanguage()]["kpi-op-open-na"] || 'N/A';
        document.getElementById('kpi-op-open').textContent = openNa;
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
        'Electric': '#5c5ff6ff',
        'Electrical': '#5c5ff6ff',
        'Structural': '#ec4899',
        'Other': '#6b7280',
        'HVAC': '#f59e0b',
        'General': '#10b981'
    };
    
    charts['requests-category'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => translateLabel(d.category, getCurrentLanguage())),
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
                    label: TRANSLATIONS[getCurrentLanguage()]["chart-res-label"] || 'Délai Réel',
                    data: reversedData.map(d => d.avg_resolution_days),
                    borderColor: '#ef4444',
                    tension: 0.4
                },
                {
                    label: TRANSLATIONS[getCurrentLanguage()]["chart-target-label"] || 'Cible (3j)',
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
    
    // Add tile layer with original colors
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        
    mapTileLayer = L.tileLayer(tileUrl, {
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
        
        const lang = getCurrentLanguage();
        const labelArr = TRANSLATIONS[lang]["map-arr"] || "Arrondissement";
        const labelOcc = TRANSLATIONS[lang]["map-occ"] || "Occupation";
        const labelRent = TRANSLATIONS[lang]["map-rent"] || "Loyer moyen";
        
        // Popup with building info
        marker.bindPopup(`
            <div class="building-popup">
                <strong>${building.name}</strong><br>
                ${building.address}<br>
                ${building.postal_code} ${building.city}<br>
                ${labelArr}: ${building.arrondissement_name}<br>
                <br>
                ${labelOcc}: ${building.occupancy_rate.toFixed(1)}% (${building.occupied_units}/${building.total_units})<br>
                ${labelRent}: ${formatCurrency(building.monthly_rent)}
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
    if (!lastUpdateTime) {
        lastUpdateTime = new Date();
    }
    const timeStr = lastUpdateTime.toLocaleTimeString('fr-FR');
    const lang = getCurrentLanguage();
    const prefix = TRANSLATIONS[lang]["last-update-prefix"] || "Mis à jour :";
    document.getElementById('last-update').textContent = `${prefix} ${timeStr}`;
}

function setupRefreshButton() {
    document.getElementById('btn-refresh').addEventListener('click', () => {
        console.log('🔄 Refreshing data...');
        location.reload();
    });
}

console.log('✅ Dashboard JavaScript loaded');

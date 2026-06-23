# Architecture — Dashboard Dirigeants Immobilier

> Projet MSP2 · Équipe : Corentin · Jack · Jonathan · Daniela

---

## Vue d'ensemble

```
Source de données                  Backend                 Frontend
─────────────────    ────────────────────────────────    ──────────────────────
pred-app-mef-dhup ──▶ build_real_estate_db.py ──▶ immobilier_real.db
   (CSV Gov. FR)                                         │
                                                         ▼
                                                    main.py (FastAPI)
                                                    http://localhost:8000
                                                         │
                                                    REST API (JSON)
                                                         │
                                                         ▼
                                                    index.html + app_with_map.js + styles.css
                                                    http://localhost:8080
                                                         │
                                                         ▼
                                                    Navigateur (Dashboard)
```

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| **Backend** | Python / FastAPI | 0.104.1 |
| **Serveur ASGI** | Uvicorn | 0.24.0 |
| **Base de données** | SQLite | — |
| **ORM / Queries** | Pandas + sqlite3 | 3.0.3 |
| **Frontend** | HTML5 / CSS3 / JavaScript vanilla | — |
| **Graphiques** | Chart.js | 3.9.1 |
| **Carte** | Leaflet.js | 1.9.4 |
| **Icônes** | Lucide | 0.263.1 |
| **Serveur statique** | Python http.server | — |

---

## Structure des fichiers

```
Reprise/
│
├── 🗄️  Base de données
│   ├── immobilier_real.db          Base SQLite (~2 Mo, données réelles)
│   ├── build_real_estate_db.py     Script de génération de la DB
│   ├── pred-app-mef-dhup.csv       Source : données gov. FR (loyers Paris/92)
│   └── integrate_paris_geolocation.py  Enrichissement géoloc. arrondissements
│
├── 🐍  Backend (API)
│   ├── main.py                     ★ API principale (FastAPI) — 655 lignes
│   ├── main_backup.py              Sauvegarde de l'API
│   ├── main_with_map.py            Version identique (alias)
│   └── requirements.txt            Dépendances Python
│
├── 🌐  Frontend
│   ├── index.html                  ★ Page principale — 342 lignes
│   ├── app_with_map.js             ★ Logique JS principale — 51 420 octets
│   ├── app.js                      Version courante (50 845 octets)
│   ├── app_backup.js               Sauvegarde JS
│   ├── styles.css                  ★ Feuille de style principale
│   ├── styles_backup.css           Sauvegarde CSS
│   └── styles_with_map.css         Alias CSS
│
├── 📦  Versions alternatives (avec carte)
│   ├── index_with_map.html
│   └── app_with_map.js (actif)
│
└── 📖  Documentation
    ├── STARTUP_GUIDE.md
    ├── README.md
    ├── README_API.md
    └── MAP_INTEGRATION_GUIDE.md
```

> **Fichiers actifs** : `index.html` charge `app_with_map.js` (ligne 339) — c'est la version avec carte Leaflet qui est en production.

---

## Base de données SQLite

Fichier : `immobilier_real.db`  
**Source des données** : Fichier gouvernemental DHUP (loyers prédits Paris + Hauts-de-Seine 92), enrichi de données synthétiques réalistes.

### Schéma des tables

```
buildings ──────────────── rental_units ────── leases ──── tenants
    │                           │                  │
    │                           │                  ▼
    │                    maintenance_requests  financial_transactions
    │
    └─────────────── incidents
```

### Détail des tables

| Table | Description | Colonnes clés |
|---|---|---|
| **buildings** | Immeubles (Paris + 92) | `building_id`, `name`, `address`, `city`, `postal_code`, `latitude`, `longitude`, `arrondissement_code`, `total_units` |
| **rental_units** | Logements par immeuble | `unit_id`, `building_id`, `floor`, `unit_number`, `type` (Studio/T2/T3/T4), `area_sqm`, `monthly_rent_base` |
| **tenants** | Locataires | `tenant_id`, `first_name`, `last_name`, `email`, `phone`, `date_of_birth` |
| **leases** | Baux (contrats) | `lease_id`, `unit_id`, `tenant_id`, `start_date`, `end_date`, `monthly_rent`, `deposit_amount`, `status` (Active/Terminated) |
| **financial_transactions** | Transactions financières | `transaction_id`, `building_id`, `lease_id`, `transaction_date`, `type` (Rent/Utility/Tax/Maintenance), `amount`, `status` (Paid/Pending) |
| **maintenance_requests** | Demandes de maintenance | `request_id`, `unit_id`, `category` (Plumbing/Electric/HVAC…), `urgency`, `status` (Open/Completed), `cost` |
| **incidents** | Incidents immeubles | `incident_id`, `building_id`, `type` (Flood/Fire/Leak…), `severity` (Low/Medium/High/Critical), `status`, `cost` |

### Volume de données (mesuré)

| Table | Enregistrements |
|---|---|
| buildings | ~110 |
| rental_units | ~880 |
| tenants | ~930 |
| leases | ~850 |
| financial_transactions | ~plusieurs milliers |
| maintenance_requests | ~1 000+ |
| incidents | ~165+ |

---

## API REST (Backend — `main.py`)

Base URL : `http://localhost:8000`  
Framework : FastAPI · CORS activé (origins: `*`)

### Endpoints disponibles

#### 🔧 Système
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/` | Liste tous les endpoints |
| GET | `/health` | État de santé + nb bâtiments en DB |

#### 📊 Vue Globale
| Méthode | Endpoint | Données retournées |
|---|---|---|
| GET | `/api/global/summary` | KPIs : revenus annuels, taux d'occupation, demandes ouvertes, incidents critiques |
| GET | `/api/global/revenue-expense` | Revenus vs dépenses sur 12 mois |
| GET | `/api/global/incident-distribution` | Répartition incidents par type et sévérité |

#### 💰 Vue Financière
| Méthode | Endpoint | Données retournées |
|---|---|---|
| GET | `/api/financial/monthly-summary` | Résumé mensuel : loyers, collecte, OpEx, marge nette (12 mois) |
| GET | `/api/financial/cost-structure` | Décomposition des coûts (Maintenance / Utility / Tax) |
| GET | `/api/financial/deposits` | Statistiques dépôts de garantie actifs |

#### 🏢 Vue Commerciale
| Méthode | Endpoint | Données retournées |
|---|---|---|
| GET | `/api/commercial/occupancy-by-building` | Taux d'occupation par immeuble |
| GET | `/api/commercial/occupancy-trend` | Tendance occupation sur 6 mois |
| GET | `/api/commercial/lease-expirations` | Baux expirant par trimestre |
| GET | `/api/commercial/turnover-rate` | Taux de rotation des locataires |

#### ⚙️ Vue Opérationnelle
| Méthode | Endpoint | Données retournées |
|---|---|---|
| GET | `/api/operational/maintenance-summary` | Résumé maintenance : total, ouverts, délai moyen, coût moyen |
| GET | `/api/operational/open-requests` | Liste des 20 demandes ouvertes les plus urgentes |
| GET | `/api/operational/resolution-time-trend` | Délai résolution vs cible (6 mois) |
| GET | `/api/operational/requests-by-category` | Demandes groupées par catégorie + coûts |
| GET | `/api/operational/incidents-summary` | Incidents par sévérité et type |

#### 🗺️ Vue Carte
| Méthode | Endpoint | Données retournées |
|---|---|---|
| GET | `/api/buildings/map` | Coordonnées GPS de tous les bâtiments + taux d'occupation + loyer moyen + bounds géographiques |

#### 🗃️ Base de données
| Méthode | Endpoint | Données retournées |
|---|---|---|
| GET | `/api/database/stats` | Nombre d'enregistrements par table |

---

## Frontend (Dashboard)

URL : `http://localhost:8080`  
Point d'entrée : [`index.html`](file:///c:/Users/Coren/Desktop/msp2/Reprise/index.html) → charge [`app_with_map.js`](file:///c:/Users/Coren/Desktop/msp2/Reprise/app_with_map.js)

### Structure de la page

```
.dashboard
├── .sidebar                    Navigation latérale
│   ├── Logo "Dashboard Dirigeants"
│   ├── .sidebar-nav            5 liens de navigation
│   │   ├── Vue Globale         [data-view="global"]
│   │   ├── Finance             [data-view="financial"]
│   │   ├── Commercial          [data-view="commercial"]
│   │   ├── Opérationnel        [data-view="operational"]
│   │   └── Carte               [data-view="map"]
│   └── .sidebar-footer         Noms d'équipe + timestamp
│
└── .content
    ├── .header                 Boutons : menu, refresh, thème, langue, avatar
    └── .view-container         Sections de vues (une seule visible à la fois)
        ├── #view-global        4 KPI cards + 2 graphiques Chart.js
        ├── #view-financial     4 KPI cards + 2 graphiques Chart.js
        ├── #view-commercial    4 KPI cards + 2 graphiques Chart.js
        ├── #view-operational   4 KPI cards + 2 graphiques Chart.js
        └── #view-map           Carte Leaflet interactive
```

### Fonctionnalités du frontend

| Fonctionnalité | Implémentation |
|---|---|
| **Navigation entre vues** | SPA — changement de classe `active`/`hidden` sans rechargement |
| **Graphiques** | Chart.js (bar, line, doughnut, radar) |
| **Carte interactive** | Leaflet.js — marqueurs colorés par taux d'occupation |
| **Thème clair/sombre** | Bouton toggle — variables CSS |
| **Multi-langue** | FR / EN / RU / JA / AR — attributs `data-i18n` |
| **Rafraîchissement** | Bouton "↻ Rafraîchir" — re-fetch tous les endpoints |
| **Responsive** | Sidebar rétractable sur mobile (`btn-menu`) |

### Flux de données (Frontend → API)

```
Chargement page
     │
     ▼
app_with_map.js init()
     │
     ├──▶ GET /api/global/summary          ──▶ KPI cards (vue globale)
     ├──▶ GET /api/global/revenue-expense  ──▶ Chart "Revenus vs Dépenses"
     ├──▶ GET /api/global/incident-distribution ──▶ Chart "Incidents par type"
     ├──▶ GET /api/financial/monthly-summary    ──▶ Chart "Résumé Mensuel"
     ├──▶ GET /api/financial/cost-structure     ──▶ Chart "Structure Coûts"
     ├──▶ GET /api/commercial/occupancy-by-building ──▶ Chart "Occupation/Immeuble"
     ├──▶ GET /api/commercial/occupancy-trend  ──▶ Chart "Tendance Occupation"
     ├──▶ GET /api/operational/maintenance-summary ──▶ KPI opérationnel
     ├──▶ GET /api/operational/resolution-time-trend ──▶ Chart "Délai résolution"
     ├──▶ GET /api/operational/requests-by-category ──▶ Chart "Par catégorie"
     └──▶ GET /api/buildings/map           ──▶ Marqueurs Leaflet (vue carte)
```

---

## Démarrage des serveurs

| Rôle | Commande | Port |
|---|---|---|
| API Backend | `python main.py` | 8000 |
| Frontend | `python -m http.server 8080` | 8080 |

**Documentation API interactive** : http://localhost:8000/docs *(Swagger UI auto-généré par FastAPI)*

---

## Données sources

| Fichier | Description |
|---|---|
| `pred-app-mef-dhup.csv` | Données officielles du Ministère (DHUP) — prédictions loyers au m² pour Paris (75) et Hauts-de-Seine (92) |

Le script [`build_real_estate_db.py`](file:///c:/Users/Coren/Desktop/msp2/Reprise/build_real_estate_db.py) :
1. Lit le CSV gouvernemental
2. Filtre sur les départements 75 et 92
3. Génère 1 à 3 immeubles par commune avec des loyers basés sur les prix réels du marché
4. Crée des unités, locataires, baux, transactions, maintenances et incidents de manière synthétique mais réaliste (seed fixée à 42 pour la reproductibilité)
5. Charge tout dans `immobilier_real.db`

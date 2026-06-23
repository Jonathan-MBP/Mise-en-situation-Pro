FASTAPI BACKEND — HOW TO RUN
============================

ÉTAPE 1 : Installation des dépendances
=====================================

```bash
pip install -r requirements.txt
```

ÉTAPE 2 : Vérifier que la base de données existe
================================================

Assure-toi que tu as `immobilier_real.db` dans le même dossier que `main.py`

```bash
ls immobilier_real.db
# Doit afficher: immobilier_real.db
```

ÉTAPE 3 : Lancer le serveur
===========================

```bash
python main.py
```

Ou :

```bash
uvicorn main:app --reload
```

Output attendu :
```
INFO:     Uvicorn running on http://127.0.0.1:8000
Press CTRL+C to quit
```

ÉTAPE 4 : Tester l'API
=====================

Ouvre ton navigateur et visite :
http://localhost:8000/docs

Tu verras une interface interactive (Swagger UI) avec tous les endpoints.

Ou teste directement :
```bash
curl http://localhost:8000/health
```

ENDPOINTS DISPONIBLES
====================

VUE GLOBALE (Global Overview)
-----------------------------
GET /api/global/summary
GET /api/global/revenue-expense
GET /api/global/incident-distribution

VUE FINANCIÈRE (Financial)
---------------------------
GET /api/financial/monthly-summary
GET /api/financial/cost-structure
GET /api/financial/deposits

VUE COMMERCIALE (Commercial)
-----------------------------
GET /api/commercial/occupancy-by-building
GET /api/commercial/occupancy-trend
GET /api/commercial/lease-expirations
GET /api/commercial/turnover-rate

VUE OPÉRATIONNELLE (Operational)
---------------------------------
GET /api/operational/maintenance-summary
GET /api/operational/open-requests
GET /api/operational/resolution-time-trend
GET /api/operational/requests-by-category
GET /api/operational/incidents-summary
GET /api/operational/incidents-by-severity

UTILITAIRE
----------
GET /health                    → Health check
GET /api/database/stats        → Database statistics

EXAMPLE : Tester un endpoint avec curl
======================================

```bash
curl http://localhost:8000/api/global/summary | python -m json.tool
```

CONNECTER LE FRONTEND
====================

Dans `app.js`, remplace les appels mock par des fetch :

```javascript
async function loadDashboardData() {
    try {
        const financial = await fetch('http://localhost:8000/api/financial/monthly-summary');
        const commercial = await fetch('http://localhost:8000/api/commercial/occupancy-by-building');
        const operational = await fetch('http://localhost:8000/api/operational/maintenance-summary');
        
        // Process et injecter dans dashboardData
        ...
    } catch (error) {
        console.error('API error:', error);
    }
}
```

TROUBLESHOOTING
===============

Erreur : "No module named 'fastapi'"
→ Relance : pip install -r requirements.txt

Erreur : "File not found: immobilier_real.db"
→ Assure-toi que la DB est dans le même dossier

Erreur : "Address already in use"
→ Change le port : uvicorn main:app --port 8001

Port bloqué ?
→ Utilise un autre port : python main.py --port 8001

DOCUMENTATION
=============

FastAPI doc auto : http://localhost:8000/docs
API spec JSON : http://localhost:8000/openapi.json

---

Besoin d'aide ? Demande !

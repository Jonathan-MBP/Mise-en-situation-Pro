DÉMARRAGE COMPLET DU DASHBOARD — FULL STACK
===========================================

ARCHITECTURE :
==============
Backend (FastAPI) → Frontend (HTML/CSS/JS) → Browser
http://localhost:8000  →  http://localhost:8080

---

PRÉREQUIS :
===========

1. Python 3.8+ installé
2. Node.js + npm (optionnel, pour live-server)
3. immobilier_real.db créée

Fichiers nécessaires :
├── immobilier_real.db     (créée par build_real_estate_db.py)
├── main.py               (API)
├── requirements.txt      (dépendances API)
├── index.html           (Frontend)
├── styles.css           (Styling)
├── app.js              (JavaScript)

---

OPTION 1 : DÉMARRAGE MANUEL (Recommandé pour démo)
===================================================

TERMINAL 1 — Lancer l'API :
---------------------------

cd /chemin/vers/le/projet

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
python main.py

Résultat attendu :
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

TERMINAL 2 — Lancer le Frontend :
----------------------------------

# Méthode A : Avec live-server (recommandé)
npm install -g live-server
live-server .

# Ou Méthode B : Avec Python
python -m http.server 8080

Résultat attendu :
```
Starting up http-server, serving .
Available on:
  http://localhost:8080
```

OUVRIR LE DASHBOARD :
---------------------

1. Ouvre ton navigateur
2. Visite : http://localhost:8080
3. Tu devrais voir le dashboard avec les vraies données

TESTER L'INTÉGRATION :
---------------------

1. L'API est accessible : http://localhost:8000/docs
2. Le frontend est accessible : http://localhost:8080
3. Les données sont chargées automatiquement
4. Navigue entre les 4 vues (Global, Financière, Commerciale, Opérationnelle)

---

OPTION 2 : DÉMARRAGE AVEC SCRIPT BASH/CMD
===========================================

Fichier : start_dashboard.sh (Linux/Mac)

#!/bin/bash
cd /chemin/vers/le/projet
pip install -r requirements.txt
python main.py &
live-server . &
echo "Dashboard running on http://localhost:8080"
echo "API running on http://localhost:8000"

Exécute :
chmod +x start_dashboard.sh
./start_dashboard.sh

---

OPTION 3 : DÉMARRAGE AVEC DOCKER (Advanced)
===========================================

Fichier : docker-compose.yml

version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    command: python main.py

  frontend:
    image: node:18
    working_dir: /app
    ports:
      - "8080:8080"
    volumes:
      - .:/app
    command: npx live-server .

Exécute :
docker-compose up

---

TROUBLESHOOTING
===============

Erreur : "Connection refused" (port 8000)
→ L'API n'est pas lancée. Vérifications :
  1. Terminal 1 : "python main.py" is running ?
  2. immobilier_real.db existe ?
  3. Dépendances installées ? (pip install -r requirements.txt)

Erreur : "Failed to fetch" dans le navigateur
→ Problème CORS ou API down
  1. Vérify API : curl http://localhost:8000/health
  2. Vérify console du navigateur (F12)

Erreur : "Port 8080 already in use"
→ Autre processus utilise le port
  # Linux/Mac
  lsof -i :8080
  kill -9 <PID>
  
  # Windows
  netstat -ano | findstr :8080
  taskkill /PID <PID> /F

Erreur : "No module named 'fastapi'"
→ pip install -r requirements.txt (dans le bon terminal)

Données n'apparaissent pas
→ Vérify :
  1. API fonctionne (check /health)
  2. immobilier_real.db a des données (check avec SQLite browser)
  3. Console navigateur (F12 → Console → erreurs ?)

---

COMMANDES UTILES
================

# Tester API avec curl
curl http://localhost:8000/api/global/summary | python -m json.tool
curl http://localhost:8000/health

# Vérifier base de données
sqlite3 immobilier_real.db "SELECT COUNT(*) FROM buildings;"

# Tuer un processus (port 8000)
lsof -i :8000 | grep python | awk '{print $2}' | xargs kill -9

# Vérifier fichiers
ls -la *.db *.py *.html

---

POUR LA SOUTENANCE (Demo Day)
==============================

Avant la démo :

1. Vérify tout marche :
   - Terminal 1 : python main.py
   - Terminal 2 : live-server .
   - Navigateur : http://localhost:8080

2. Reload les données (Ctrl+F5 dans le navigateur)

3. Vérify tous les endpoints répondent :
   curl http://localhost:8000/api/global/summary

4. Prepare les 4 vues à montrer (Global, Financière, Commerciale, Opérationnelle)

Pendant la démo :

- Montre le frontend (dashboard)
- Clique sur les 4 vues pour montrer les données en direct
- Ouvre http://localhost:8000/docs pour montrer les endpoints
- (Optionnel) Ouvre SQLite pour montrer la base de données

---

NOTES IMPORTANTES
=================

✓ La base de données (immobilier_real.db) doit être dans le même dossier que main.py
✓ L'API doit être lancée AVANT le frontend (sinon les données ne chargent pas)
✓ Les deux serveurs (API + Frontend) doivent tourner en parallèle
✓ Utilise deux terminaux différents pour les lancer
✓ Les données se chargent automatiquement au refresh de la page

---

CHECKLIST AVANT SOUTENANCE
===========================

□ immobilier_real.db existe
□ main.py fonctionne (python main.py)
□ Frontend fonctionne (live-server)
□ 4 vues affichent des données
□ API endpoints accessibles (/docs)
□ Tous les graphiques s'affichent
□ Pas d'erreurs dans la console (F12)
□ Présentation préparée

---

Questions ? Demande !

# 🗺️ DASHBOARD DIRIGEANTS — MAP INTEGRATION GUIDE

## FICHIERS CRÉÉS

```
integrate_paris_geolocation.py     ← Script pour récupérer données géographiques
main_with_map.py                   ← FastAPI backend avec /api/buildings/map
index_with_map.html                ← HTML avec vue carte
app_with_map.js                    ← JavaScript avec Leaflet.js
styles_with_map.css                ← CSS avec styles carte
```

---

## 🚀 ÉTAPES D'INTÉGRATION

### ÉTAPE 1 : Récupérer les données géographiques

```bash
# Exécute le script pour ajouter lat/long à la database
python integrate_paris_geolocation.py
```

**Temps estimé :** 5-10 minutes (appels API + géocodage)

**Ce que ça fait :**
- Récupère les 20 arrondissements officiels de Paris
- Charge les codes INSEE pour chaque commune
- Géocode les 50 immeubles (latitude/longitude)
- Ajoute 6 colonnes à la table `buildings` :
  - `latitude` (coordonnée GPS)
  - `longitude` (coordonnée GPS)
  - `arrondissement_code` (01-20)
  - `arrondissement_name` (1er, 2e, ... 20e)
  - `code_insee` (code officiel commune)
  - `district` (nom arrondissement)

**Résultat :**
```
immobilier_real.db
├── buildings (50) : maintenant avec lat/long
└── [autres tables inchangées]
```

---

### ÉTAPE 2 : Remplacer les fichiers backend

**Arrête l'API actuelle** (Ctrl+C)

```bash
# Sauvegarde ton ancien main.py (backup)
mv main.py main_backup.py

# Remplace par la nouvelle version avec endpoint /api/buildings/map
cp main_with_map.py main.py
```

**Nouveau endpoint créé :**
```
GET /api/buildings/map
→ Retourne tous les immeubles avec lat/long + occupancy
```

---

### ÉTAPE 3 : Remplacer les fichiers frontend

```bash
# Sauvegarde tes anciens fichiers
mv index.html index_backup.html
mv app.js app_backup.js
mv styles.css styles_backup.css

# Remplace par les versions avec carte
cp index_with_map.html index.html
cp app_with_map.js app.js
cp styles_with_map.css styles.css
```

---

### ÉTAPE 4 : Démarrer le système

**Terminal 1 — Backend :**
```bash
python main.py
# Expected: Uvicorn running on http://127.0.0.1:8000
```

**Terminal 2 — Frontend :**
```bash
npm install -g live-server  # Si pas installé
live-server .
# Expected: Available on: http://localhost:8080
```

**Terminal 3 — Test (optionnel) :**
```bash
curl http://localhost:8000/api/buildings/map | python -m json.tool
# Devrait afficher tous les immeubles avec coordonnées
```

---

## 📋 CE QUI CHANGE

### AVANT
```
Vue Globale
Vue Financière
Vue Commerciale
Vue Opérationnelle
```

### APRÈS
```
Vue Globale
Vue Financière
Vue Commerciale
Vue Opérationnelle
🗺️ CARTE ← NOUVELLE
```

---

## 🗺️ VUE CARTE — DÉTAILS

### Fonctionnalités

✅ **Affichage des immeubles**
- Marqueurs circulaires sur la carte
- Code couleur par occupancy rate :
  - 🟢 Vert (>80%) : Occupation forte
  - 🟡 Jaune (50-80%) : Occupation moyenne
  - 🔴 Rouge (<50%) : Occupation faible

✅ **Interactivité**
- Clic sur marqueur = popup avec infos immeuble
  - Nom, adresse, code postal, arrondissement
  - Occupancy rate (% et nombre d'unités)
  - Loyer moyen mensuel

✅ **Legende**
- À droite de la carte
- Explique le code couleur
- Informations sur les immeubles

✅ **Auto-zoom**
- Map auto-centre sur tous les immeubles
- Zoom optimal pour voir toute la zone

---

## 📊 DONNÉES AFFICHÉES

Chaque marqueur sur la carte retourne :

```json
{
  "building_id": 1,
  "name": "Immeuble 1",
  "address": "123 Rue de Paris",
  "city": "Paris",
  "postal_code": "75001",
  "latitude": 48.8623,
  "longitude": 2.3522,
  "arrondissement_code": "01",
  "arrondissement_name": "1er",
  "total_units": 5,
  "occupied_units": 4,
  "occupancy_rate": 80.0,
  "monthly_rent": 3500.00
}
```

---

## 🔧 TECHNOLOGIE UTILISÉE

**Leaflet.js**
- Bibliothèque de cartographie gratuite, open source
- Pas besoin de clé API (contrairement à Google Maps / MapBox)
- Utilise OpenStreetMap (données libres)
- Léger, rapide, facile à configurer

**Sources de données cartographiques :**
- OpenStreetMap (tiles de la carte)
- data.paris.fr (arrondissements officiels)
- Nominatim (géocodage)

---

## ✅ CHECKLIST DE VÉRIFICATION

Après démarrage du système :

```
[ ] API démarre sans erreur
[ ] Endpoint /api/buildings/map répond (curl test)
[ ] Frontend charge à http://localhost:8080
[ ] Toutes les 5 vues chargent (y compris Carte)
[ ] Clic sur "🗺️ Carte" affiche la carte
[ ] Marqueurs visibles sur la carte
[ ] Clic sur marqueur = popup avec infos
[ ] Legende à droite de la carte
[ ] Zoom/pan de la carte fonctionne
[ ] Couleurs des marqueurs sont cohérentes (85.5% occupancy = vert)
```

---

## 🐛 TROUBLESHOOTING

### Erreur : "No module named 'requests'"
```bash
pip install requests
```

### Erreur : "Nominatim timeout"
- Le script a un fallback : utilisera les coordonnées par défaut (48.8566, 2.3522)
- Réessaye dans 5 minutes

### Carte ne charge pas / Marqueurs vides
```bash
# Vérifie que l'endpoint fonctionne
curl http://localhost:8000/api/buildings/map

# Vérifiez la console du navigateur (F12 → Console tab)
# Cherchez les erreurs JavaScript
```

### Popup s'affiche mais infos manquent
- C'est normal si Nominatim timeout
- Relance le script `integrate_paris_geolocation.py` avec meilleure connexion

---

## 📈 PROCHAINES ÉTAPES (OPTIONAL)

### 1. Ajouter clustering (grouper marqueurs au zoom faible)
```bash
pip install folium  # Ou utiliser Leaflet.markercluster
```

### 2. Ajouter filtres à la carte
- Filter par arrondissement
- Filter par occupancy rate
- Filter par plage de loyers

### 3. Exporter carte en PDF
- Pour rapports mensuels

### 4. Heatmap occupancy
- Gradient de couleur sur toute la région
- Visualiser les zones fortes/faibles

---

## 📝 DOCUMENTATION À METTRE À JOUR

Après intégration :

**Word Document :**
- ✅ Section "Base de données" → Ajouter "6 colonnes géographiques ajoutées"
- ✅ Section "Vue Carte" → Nouvelle section
- ✅ Section "Frontend" → Expliquer Leaflet.js

**PowerPoint :**
- 📍 Slide 8 "Sources de données" → Mettre à jour pour dire "API open data Paris intégrée"
- 🗺️ Slide 7 "Fonctionnalités" → Ajouter screenshot de la carte
- 📊 Ajouter slide de démo de la carte

---

## 🎯 RÉSUMÉ

| Étape | Action | Temps |
|-------|--------|-------|
| 1 | Récupérer données géographiques | 10 min |
| 2 | Remplacer backend (main.py) | 1 min |
| 3 | Remplacer frontend (HTML/JS/CSS) | 1 min |
| 4 | Tester l'intégration | 5 min |
| 5 | Mettre à jour documentation | 15 min |
| **TOTAL** | | **~30 min** |

---

**T'es bon pour lancer ? Des questions ?** 🚀

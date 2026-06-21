# Guide de Démarrage Rapide 🚀

Ce document regroupe les commandes essentielles pour lancer le site localement sur **Windows** (Backend FastAPI + Frontend HTML/CSS/JS).

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :
1. **Python 3.8+** installé (cochez l'option *Add Python to PATH* lors de l'installation).
2. La base de données `immobilier_real.db` présente à la racine du projet.

---

## ⚡ Lancement Rapide (Étape par Étape)

Le projet nécessite de lancer deux serveurs en parallèle : le **Backend (API)** et le **Frontend (Site)**. Ouvrez **deux terminaux distincts** (par exemple en utilisant PowerShell ou l'invite de commandes).

### Étape 1 : Lancer le Backend (API)
Dans le **premier terminal**, exécutez les commandes suivantes :

1. **Installer les dépendances Python :**
   ```powershell
   pip install -r requirements.txt
   ```

2. **Lancer le serveur API (FastAPI) :**
   ```powershell
   python main.py
   ```
   *L'API est maintenant lancée et écoute sur [http://127.0.0.1:8000](http://127.0.0.1:8000).*
   *Vous pouvez consulter la documentation interactive sur [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).*

---

### Étape 2 : Lancer le Frontend (Site Web)
Dans le **second terminal**, lancez un serveur HTTP local pour servir les fichiers statiques (HTML/CSS/JS). Choisissez l'une des deux méthodes suivantes :

#### Option A : Avec Python (Recommandé - Sans installation supplémentaire)
```powershell
python -m http.server 8080
```

#### Option B : Avec `live-server` (Recommandé pour le développement - Rechargement automatique)
```powershell
# Installer live-server globalement (nécessite Node.js)
npm install -g live-server

# Lancer live-server dans le dossier actuel
live-server .
```

---

## 🌐 Accéder au Site

Une fois les deux serveurs démarrés :
1. Ouvrez votre navigateur internet.
2. Accédez à l'adresse suivante : **[http://localhost:8080](http://localhost:8080)** (ou le port indiqué par `live-server` s'il est différent).
3. Le tableau de bord chargera automatiquement les données de l'API.

---

## 🛠️ En cas de problème (Dépannage)

* **Le site s'affiche mais est vide (pas de données) :**
  Vérifiez que le premier terminal (Backend) est bien démarré et qu'aucune erreur ne s'y affiche. Vous pouvez tester l'API directement en ouvrant [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) dans votre navigateur.
* **Erreur "Port already in use" (8000 ou 8080) :**
  Un autre programme utilise déjà ce port. Vous pouvez tuer le processus bloquant ou lancer le serveur web sur un autre port, par exemple :
  ```powershell
  python -m http.server 8081
  ```
  *(Et accédez ensuite à http://localhost:8081)*

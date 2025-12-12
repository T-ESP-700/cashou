# Cashou - Application avec PostgreSQL + Prisma + Bun

Ce projet utilise **Bun** comme runtime, **PostgreSQL** comme base de données et **Prisma** comme ORM.

# Description
Cette application éducative est un jeu sérieux qui transforme l'apprentissage
de la finance en une expérience ludique et interactive. En relevant des défis et
en prenant des décisions, les utilisateurs débloquent de nouvelles
fonctionnalités et progressent dans leur compréhension des principes
financiers et des stratégies d'investissement

## 🚀 Installation
cloner le projet

```bash
git clone https://github.com/T-ESP-700/cashou
cd cashou
```

### Prérequis

1. **Bun** installé sur votre système
2. **PostgreSQL** installé et en cours d'exécution
3. **Docker** et **Docker Compose** (recommandé pour le développement)

## 📦 Installation des dépendances

### Option 1: Installation depuis la racine (Recommandé)
# Installation de toutes les dépendances (workspaces Bun)

```bash
bun install
```

# Ou installation complète
```bash
bun run install:all
```

### Option 2: Installation manuelle
```bash
# Backend
cd backend
bun install

# Backoffice
cd ../backoffice
bun install
```

### Configuration de la base de données

#### Option 1: Avec Docker (Recommandé)

# Démarrer les services avec Docker Compose
- Créer un ficher .env à la racine du projet
- Contenu du fichier à récupérer sur Notion :
`https://www.notion.so/rocktane/Fichier-d-environnement-env-22ae4b8c7ecb80609138fb8aec535c70`

# Démarrer les services Docker
```bash
docker compose up -d --build
```

# Les bases de données seront disponibles sur :
# _ db_cashou: localhost:5432 (cashou_db)
# — db_backoffice: localhost:5433 (backoffice)


#### Option 2: PostgreSQL local
```bash
# Se connecter à PostgreSQL (en tant qu'utilisateur postgres)
psql -U postgres

# Créer la base de données
CREATE DATABASE cashou_db;

# Créer un utilisateur (optionnel)
CREATE USER cashou_user WITH PASSWORD 'votre_mot_de_passe';

# Donner les permissions
GRANT ALL PRIVILEGES ON DATABASE cashou_db TO cashou_user;

# Quitter psql
\q
```

## 🗄️ Configuration de Prisma

### Générer le client Prisma
```bash
cd backend
bun prisma generate
```

### Créer et appliquer les migrations
```bash
# Créer une nouvelle migration
bun prisma migrate dev --name init

# Appliquer les migrations en production
bun prisma migrate deploy
```

### Réinitialiser la base de données (développement uniquement)
```bash
bun prisma migrate reset
```

### Tests avec Bun
# Vérifier que Bun reconnaît la config
```bash
bun test --dry-run
```

```bash
# Lancer les tests
bun test
```

# Avec couverture
```bash
bun test --coverage
```


## 🛠️ Scripts disponibles

### Scripts depuis la racine (Recommandé)

#### Développement
```bash
bun run dev              # Démarrer backend + backoffice simultanément
bun run dev:backend      # Démarrer uniquement le backend
bun run dev:backoffice   # Démarrer uniquement le backoffice
```

#### Base de données (Prisma)
```bash
bun run generate         # Générer le client Prisma
bun run migrate          # Créer/appliquer une migration
bun run migrate:deploy   # Appliquer migrations (production)
bun run migrate:reset    # Réinitialiser et appliquer toutes les migrations
bun run studio           # Interface graphique Prisma (http://localhost:5555)
```

#### Données
```bash
bun run db:seed          # Créer des données de test
bun run db:empty         # Vider complètement la base de données
bun run db:check         # Vérifier la synchronisation
bun run db:status        # Vérifier l'état et connexion DB
```

#### Docker
```bash
bun run docker:up        # Démarrer tous les services
bun run docker:down      # Arrêter tous les services
bun run docker:build     # Construire les images
bun run docker:logs      # Voir les logs en temps réel
bun run docker:clean     # Nettoyer volumes et containers
```

#### Scripts de setup
```bash
bun run setup            # Setup complet : Docker + deps + migrate
bun run reset            # Reset complet : nettoyage + setup
bun run install:all      # Installer toutes les dépendances
bun run clean            # Nettoyer tous les node_modules
```

### Scripts individuels (si nécessaire)
```bash
# Backend
cd backend && bun run dev
cd backend && bun run generate

# Backoffice
cd backoffice && bun run dev
cd backoffice && bun run build
```

## 🔧 Configuration des outils de développement

### Cursor Rules

Ce projet inclut des **Cursor Rules** (`.cursorrules`) qui définissent les bonnes pratiques pour :
- **Bun** : Utilisation préférée de `bun` au lieu de `npm/yarn`
- **TypeScript** : Configuration stricte et types appropriés
- **Prisma** : Conventions de nommage et bonnes pratiques ORM
- **Docker** : Workflow de développement containerisé
- **Architecture** : Séparation backend/backoffice

### MCP Server Context7

Le projet est configuré avec **Context7 MCP Server** pour une documentation à jour et une assistance IA améliorée.

#### Configuration automatique
Un fichier `.cursor/mcp.json` est inclus avec la configuration optimale pour Context7.

#### Utilisation avec Cursor
La configuration MCP est automatiquement détectée par Cursor via le fichier `.cursor/mcp.json`.

Pour une configuration manuelle, vous pouvez ajouter cette configuration à votre `settings.json` global :
```json
{
  "mcpServers": {
    "context7": {
      "command": "bunx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

#### Utilisation dans vos prompts
```text
Comment implémenter l'authentification avec Prisma ? use context7
Créer un middleware pour vérifier les JWT avec Bun. use context7
```

#### Vérification de la configuration
Pour vérifier que Context7 MCP est bien configuré dans Cursor :

1. **Via l'interface Cursor** :
   - Ouvrez les paramètres Cursor (`Cmd/Ctrl + ,`)
   - Recherchez "MCP" pour voir les serveurs configurés
   - Vérifiez que "context7" apparaît dans la liste

2. **Via les logs** (en cas de problème) :
   ```bash
   # macOS/Linux
   tail -f ~/Library/Application\ Support/Cursor/logs/mcp.log

   # Windows
   tail -f %APPDATA%\Cursor\logs\mcp.log
   ```

3. **Test dans le chat** :
   - Utilisez "use context7" dans vos prompts
   - Le serveur devrait se connecter automatiquement

### .gitignore amélioré

Le `.gitignore` a été mis à jour pour inclure :
- **Bun** : `bun.lockb`, logs de debug Bun
- **Prisma** : Fichiers générés, migrations SQL
- **Docker** : Overrides et fichiers temporaires
- **IDE** : Configuration VS Code, logs Cursor (conserve `.cursor/mcp.json`)
- **OS** : Fichiers système macOS, Windows, Linux

### Structure .cursor

Le dossier `.cursor/` contient :
- **`mcp.json`** : Configuration des serveurs MCP (Model Context Protocol)
- **Logs et cache** (ignorés par git) : `logs/`, `workspaceStorage/`

Cette structure suit les conventions récentes de Cursor pour la gestion des configurations MCP au niveau projet.

### Workspaces Bun

Le projet utilise les **workspaces Bun** pour une gestion centralisée :

#### ✅ Avantages
- **Installation unique** : `bun install` installe toutes les dépendances
- **Déduplication** : Partage des dépendances communes entre backend/backoffice
- **Scripts centralisés** : Orchestration depuis la racine
- **Gestion simplifiée** : Un seul `bun.lock` pour tout le projet
- **Performance** : Optimisations Bun pour les monorepos

#### 🗂️ Structure
```json
{
  "workspaces": ["backend", "backoffice"],
  "scripts": {
    "dev": "concurrently \"bun run dev:backend\" \"bun run dev:backoffice\"",
    "setup": "bun run docker:up && bun run install:all && bun run generate && bun run migrate"
  }
}
```

#### 🚀 Commandes simplifiées
```bash
# Avant (sans workspaces)
cd backend && bun install && bun run generate && bun run migrate && bun run dev

# Maintenant (avec workspaces)
bun run setup && bun run dev
```

## 📝 Utilisation

### ✅ Base de données vide par défaut
La base de données est **vide** par défaut. Le fichier `index.ts` vérifie seulement la connexion.

### 🧪 Données de test (optionnelles)
Si vous voulez des données de test pour développer :

```bash
# Créer des données de test complètes
cd backend
bun run db:seed

# Vider la base et recommencer
bun run db:empty
```



## 🏗️ Structure du projet

```
cashou/                         # 🗂️ Monorepo avec workspaces Bun
├── package.json                # 📦 Configuration racine + scripts d'orchestration
├── bun.lock                    # 🔒 Lock file Bun workspaces
├── node_modules/               # 📚 Dépendances partagées
├── backend/                    # 🚀 API Backend
│   ├── prisma/
│   │   ├── app/
│   │   │   ├── schema.prisma   # 🗄️ Schéma principal (25 tables)
│   │   │   └── migrations/     # 📋 Historique des migrations
│   │   └── backoffice/
│   │       └── schema.prisma   # 🗄️ Schéma backoffice
│   ├── src/
│   │   ├── database.ts         # ⚙️ Configuration Prisma
│   │   ├── seed-data.ts        # 🌱 Données de test (optionnel)
│   │
│   │
│   ├── scripts/
│   │   └── db-check.ts         # 🔍 Script de vérification DB
│   ├── index.ts                # 🎯 Point d'entrée backend
│   └── package.json            # 📦 Dépendances backend
├── backoffice/                 # 🎛️ Interface d'administration
│   ├── index.ts                # 🎯 Point d'entrée backoffice
│   └── package.json            # 📦 Dépendances backoffice
├── docker-compose.yml          # 🐳 Configuration Docker
├── .cursor/
│   └── mcp.json                # 🤖 Configuration MCP Context7 pour Cursor
├── .cursorrules                # 📏 Règles Cursor pour le projet
├── context7.json               # 📚 Configuration Context7 spécifique
├── .gitignore                  # 🚫 Gitignore amélioré
├── README.md                   # 📖 Documentation
├── ARCHITECTURE.md             # 🏗️ Documentation technique approfondie
└── CLEANUP.md                  # 🧹 Documentation du nettoyage
```

## 🔧 Développement

### Workflow recommandé
```bash
# Setup complet automatique
bun run setup

# Ou étape par étape :
bun run docker:up        # 1. Démarrer les services Docker
bun install              # 2. Installer les dépendances (workspaces)
bun run generate         # 3. Générer le client Prisma
bun run migrate          # 4. Appliquer les migrations
bun run dev              # 5. Démarrer le développement (backend + backoffice)
```

### Modifications du schéma
1. Modifiez le schéma dans `backend/prisma/app/schema.prisma`
2. Créez une migration : `bun prisma migrate dev --name nom_de_la_migration`
3. Le client Prisma sera automatiquement généré

### Architecture

**Backend** (`/backend`) :
- API principale avec Prisma ORM
- Base de données : `cashou_db` (port 5432)
- 25 tables pour la logique de jeu complète
- Gestion des utilisateurs, niveaux, transactions, quiz

**Backoffice** (`/backoffice`) :
- Interface d'administration
- Base de données séparée : `backoffice` (port 5433)
- Intégration Supabase pour l'auth admin

## 📊 Prisma Studio

Pour explorer vos données graphiquement :
```bash
cd backend
bun run studio
```

Cela ouvrira une interface web sur `http://localhost:5555`.

## 🐳 Docker

### Services disponibles
- **backend** : API principale (port 3000)
- **backoffice** : Interface admin (port 5173)
- **db_cashou** : PostgreSQL pour l'app (port 5432)
- **db_backoffice** : PostgreSQL pour le backoffice (port 5433)



### Commandes utiles
```bash
# Démarrer en arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart backend

# Nettoyer les volumes
docker-compose down -v
```

## 🤖 Assistance IA

Ce projet est optimisé pour travailler avec des assistants IA :

- **Cursor Rules** : Bonnes pratiques automatiques
- **Context7 MCP** : Documentation à jour des librairies
- **Configuration TypeScript** : Types stricts pour une meilleure assistance
- **Exemples inclus** : Patterns de code réutilisables

### Prompts recommandés
```text
Ajouter une nouvelle table Prisma pour les achievements. use context7
Créer un endpoint API pour les statistiques utilisateur avec Bun
Implémenter la logique de calcul des points de niveau
```

### Scripts utiles pour le développement
```bash
# Développement rapide
bun run dev              # Lance backend + backoffice
bun run studio           # Interface Prisma pour explorer les données
bun run db:status        # Vérifier l'état de la base de données

# Reset complet en cas de problème
bun run reset            # Remet tout à zéro et repart proprement

# Gestion des dépendances
bun install              # Installation via workspaces Bun
bun run clean            # Nettoyage complet des node_modules
```

## 🔒 Sécurité

- Variables d'environnement pour les données sensibles
- Validation des entrées utilisateur
- Transactions Prisma pour l'intégrité des données
- Séparation des bases de données app/admin
- Configuration Docker sécurisée

## 🚀 Déploiement

Pour le déploiement en production :

1. **Variables d'environnement** : Configurez les URLs de base de données
2. **Migrations** : `bun run migrate:deploy`
3. **Build** : `bun run build`
4. **Docker** : Utilisez les Dockerfiles fournis
5. **Volumes** : Configurez la persistance des données PostgreSQL

## 📚 Documentation

- **[README.md](README.md)** : Guide de démarrage et utilisation
- **[ARCHITECTURE.md](ARCHITECTURE.md)** : Documentation technique approfondie
- **[.cursorrules](.cursorrules)** : Règles pour l'assistance IA
- **[context7.json](context7.json)** : Configuration Context7 MCP

## 🤝 Contribution

Ce projet utilise les workspaces Bun pour une expérience de développement optimisée. Consultez [ARCHITECTURE.md](ARCHITECTURE.md) pour comprendre l'organisation du code.

# cachou

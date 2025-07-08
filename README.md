# Cashou - Application avec PostgreSQL + Prisma + Bun

Ce projet utilise **Bun** comme runtime, **PostgreSQL** comme base de données et **Prisma** comme ORM.

## 🚀 Installation

### Prérequis

1. **Bun** installé sur votre système
2. **PostgreSQL** installé et en cours d'exécution

### Configuration de la base de données

1. **Créer une base de données PostgreSQL :**
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

2. **Configurer les variables d'environnement :**
   ```bash
   # Modifier le fichier .env avec vos paramètres PostgreSQL
   DATABASE_URL="postgresql://username:password@localhost:5432/cashou_db?schema=public"
   ```
   Remplacez `username`, `password` et `cashou_db` par vos vraies valeurs.

## 📦 Installation des dépendances

```bash
bun install
```

## 🗄️ Configuration de Prisma

### Générer le client Prisma
```bash
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

## 🛠️ Scripts disponibles

```bash
# Démarrer l'application (vérifie la connexion DB)
bun run dev

# Base de données
bun run generate         # Générer le client Prisma
bun run migrate          # Créer/appliquer une migration
bun run studio           # Interface graphique (http://localhost:5555)

# Données
bun run db:seed          # Créer des données de test (optionnel)
bun run db:empty         # Vider complètement la base de données
bun run db:check         # Vérifier la synchronisation
```

## 📝 Utilisation

### ✅ Base de données vide par défaut
La base de données est **vide** par défaut. Le fichier `index.ts` vérifie seulement la connexion.

### 🧪 Données de test (optionnelles)
Si vous voulez des données de test pour développer :

```bash
# Créer des données de test complètes
bun run db:seed

# Vider la base et recommencer
bun run db:empty
```

### 📚 Exemples d'opérations
Les exemples d'opérations CRUD se trouvent dans `src/examples/user-operations.ts` :
- Gestion des utilisateurs et niveaux
- Création de marchés et actifs
- Instances de jeu et transactions
- Quiz et notifications

## 🏗️ Structure du projet

```
cashou/
├── prisma/
│   ├── schema.prisma      # Schéma de la base de données (25 tables)
│   └── migrations/        # Historique des migrations
├── src/
│   ├── database.ts        # Configuration Prisma
│   ├── seed-data.ts       # Données de test (optionnel)
│   └── examples/
│       └── user-operations.ts  # Exemples CRUD complets
├── index.ts               # Point d'entrée (vérification connexion)
├── .env                   # Variables d'environnement
└── package.json
```

## 🔧 Développement

1. Modifiez le schéma dans `prisma/schema.prisma`
2. Créez une migration : `bun prisma migrate dev --name nom_de_la_migration`
3. Le client Prisma sera automatiquement généré

## 📊 Prisma Studio

Pour explorer vos données graphiquement :
```bash
bun run studio
```

Cela ouvrira une interface web sur `http://localhost:5555`.

# Architecture Cashou

## Vue d'ensemble

Cashou est une application de jeu financier construite avec une architecture monorepo moderne utilisant les workspaces Bun.

## Stack Technique

### Runtime & Langages
- **Bun** : Runtime JavaScript ultra-rapide avec support TypeScript natif
- **TypeScript** : Typage statique pour une meilleure robustesse
- **Node.js ESM** : Modules ES6 natifs

### Base de données
- **PostgreSQL** : Base de données relationnelle performante
- **Prisma ORM** : Type-safe database access avec migrations
- **Docker** : Containerisation pour l'environnement de développement

### Architecture
```
┌─────────────────┐    ┌─────────────────┐
│    Backoffice   │    │     Backend     │
│   (Admin UI)    │    │   (Game API)    │
│                 │    │                 │
│  Port: 5173     │    │  Port: 3000     │
└─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         └───────────┬───────────┘
                     │
┌─────────────────────────────────────────┐
│            Docker Compose               │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ PostgreSQL  │  │   PostgreSQL    │   │
│  │ Backoffice  │  │   App (Main)    │   │
│  │ Port: 5433  │  │   Port: 5432    │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

## Workspaces Bun

### Configuration
```json
{
  "workspaces": ["backend", "backoffice"],
  "private": true
}
```

### Avantages
1. **Gestion centralisée** : Un seul `package.json` pour orchestrer
2. **Optimisation** : Dépendances partagées et déduplication
3. **Scripts unifiés** : Commandes cross-packages depuis la racine
4. **Performance** : Bun optimise les monorepos natifs

## Structure des données

### Base de données principale (cashou_db)
- **25 tables** interconnectées
- **Gestion complète** : Users, Levels, Games, Transactions
- **Système de points** et achievements
- **Quiz et notifications**

### Base de données backoffice
- **Administration** séparée pour la sécurité
- **Gestion des utilisateurs** admin
- **Analytics et reporting**

## Prisma Schema

### Conventions
- **camelCase** pour les champs
- **PascalCase** pour les modèles
- **@map** pour mapper aux noms de colonnes DB
- **Relations explicites** avec foreign keys

### Exemple
```prisma
model User {
  id       Int    @id @default(autoincrement())
  username String?
  levelId  Int    @map("level_id")

  level Level @relation(fields: [levelId], references: [id])

  @@map("users")
}
```

## Scripts d'orchestration

### Développement
```json
{
  "dev": "concurrently \"bun run dev:backend\" \"bun run dev:backoffice\"",
  "dev:backend": "cd backend && bun run dev",
  "dev:backoffice": "cd backoffice && bun run dev"
}
```

### Base de données
```json
{
  "generate": "cd backend && bunx prisma generate --schema=prisma/app/schema.prisma",
  "migrate": "cd backend && bunx prisma migrate dev --schema=prisma/app/schema.prisma",
  "studio": "cd backend && bunx prisma studio --schema=prisma/app/schema.prisma"
}
```

### Docker
```json
{
  "docker:up": "docker-compose up -d",
  "docker:down": "docker-compose down",
  "docker:logs": "docker-compose logs -f"
}
```

## Workflow de développement

### Setup initial
```bash
git clone <repo>
cd cashou
bun run setup  # Docker + deps + migrate + generate
```

### Développement quotidien
```bash
bun run dev           # Lance backend + backoffice
bun run studio        # Interface Prisma
bun run docker:logs   # Voir les logs Docker
```

### Modifications schema
```bash
# 1. Modifier backend/prisma/app/schema.prisma
# 2. Créer migration
bun run migrate
# 3. Le client Prisma se régénère automatiquement
```

## Sécurité

### Base de données
- **Séparation** : App et backoffice ont des BDD distinctes
- **Variables d'environnement** pour les credentials
- **Validation** : Prisma + TypeScript pour la type safety

### Docker
- **Isolation** : Services containerisés
- **Volumes** : Persistance des données PostgreSQL
- **Networks** : Communication interne sécurisée

## Monitoring & Debug

### Logs
```bash
# Application
bun run docker:logs

# Prisma (si problème DB)
cd backend && bunx prisma db pull --force

# MCP Context7 (Cursor)
tail -f ~/Library/Application\ Support/Cursor/logs/mcp.log
```

### Debugging
- **Prisma Studio** : Interface graphique BDD
- **Docker logs** : Inspection des services
- **DB Status** : `bun run db:status` pour vérifier la connexion
- **Bun debugger** : Support natif debugging TypeScript

## Bonnes pratiques

### Code
- **TypeScript strict** activé
- **ESLint + Prettier** pour la cohérence
- **Cursor Rules** : Guide IA pour le projet

### Git
- **Conventional commits** recommandés
- **Feature branches** pour nouvelles fonctionnalités
- **.gitignore** optimisé pour Bun + Prisma + Docker

### Déploiement
- **Migrations** : `bun run migrate:deploy` en production
- **Build** : Containers Docker optimisés
- **Env vars** : Configuration par environnement

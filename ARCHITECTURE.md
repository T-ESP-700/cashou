# Architecture Monorepo - Projet Cashou

## Structure du projet

```
cashou/
├── apps/                          # Applications et services
│   ├── backend/                   # API tRPC + Better-Auth
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── backoffice/               # Dashboard admin React
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── mobile/                   # App React Native (futur)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                     # Packages partagés
│   ├── @cashou/db-app/          # Schema Prisma application
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   └── client.ts
│   │   └── package.json
│   ├── @cashou/db-backoffice/   # Schema Prisma backoffice
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   └── client.ts
│   │   └── package.json
│   ├── @cashou/api/              # Client tRPC et types API
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   └── types.ts
│   │   └── package.json
│   ├── @cashou/auth/             # Config Better-Auth partagée
│   │   ├── src/
│   │   │   ├── client.ts      # Client auth (mobile/web)
│   │   │   ├── server.ts      # Config serveur
│   │   │   └── types.ts
│   │   └── package.json
│   ├── @cashou/ui/               # Composants UI partagés
│   │   ├── src/
│   │   └── package.json
│   ├── @cashou/config/           # Config partagée
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── package.json
│   └── @cashou/utils/            # Utilitaires partagés
│       ├── src/
│       └── package.json
│
├── docker-compose.yml            # Configuration Docker
│
├── .github/                      # CI/CD
│   └── workflows/
├── bunfig.toml                  # Configuration Bun workspace
├── package.json                 # Scripts root
├── tsconfig.json               # TypeScript config root
├── .env.example                # Variables d'environnement
└── turbo.json                  # Config Turborepo (optionnel)
```

## Configuration du Monorepo

### 1. Configuration Bun workspace

```toml
# bunfig.toml
[workspace]
packages = [
  "apps/*",
  "packages/@cashou/*"
]
```

### 2. Package.json racine

```json
{
  "name": "cashou",
  "private": true,
  "packageManager": "bun@1.0.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean && rm -rf node_modules",
    "db:migrate:app": "bun run --filter '@cashou/db-app' migrate",
    "db:migrate:backoffice": "bun run --filter '@cashou/db-backoffice' migrate",
    "db:generate": "turbo db:generate",
    "docker:up": "docker-compose up",
    "docker:down": "docker-compose down"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "turbo": "latest",
    "typescript": "^5.3.0"
  }
}
```

## Packages Partagés - Architecture Détaillée

### 1. @cashou/db-app - Base de données application

```typescript
// packages/db-app/src/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Re-export all types from Prisma
export * from '@prisma/client';
```

```json
// packages/db-app/package.json
{
  "name": "@cashou/db-app",
  "version": "1.0.0",
  "main": "./src/client.ts",
  "types": "./src/client.ts",
  "scripts": {
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.x.x"
  },
  "devDependencies": {
    "prisma": "^5.x.x"
  }
}
```

### 2. @cashou/auth - Authentification partagée

```typescript
// packages/auth/src/server.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@cashou/db-app';

// Configuration serveur pour le backend
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // ... autres configs
});

export type Auth = typeof auth;
```

```typescript
// packages/auth/src/client.ts
import { createAuthClient } from 'better-auth/client';
import type { Auth } from './server';

// Client réutilisable pour mobile et web
export const createAuth = (baseURL: string) => {
  return createAuthClient<Auth>({
    baseURL,
  });
};

// Types exportés
export type { Session, User } from 'better-auth/types';
```

### 3. @cashou/api - Client tRPC et types

```typescript
// packages/api/src/types.ts
// Types générés automatiquement depuis le router backend
export type { AppRouter } from '../../../apps/backend/src/routers';

// Types métier partagés
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

```typescript
// packages/api/src/client.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './types';

export const createApiClient = (url: string, getHeaders?: () => Promise<HeadersInit>) => {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        headers: getHeaders,
      }),
    ],
  });
};
```

## Gestion des Dépendances

### Packages utilisés par plusieurs services

```json
// apps/backend/package.json
{
  "dependencies": {
    "@cashou/db-app": "workspace:*",
    "@cashou/auth": "workspace:*",
    "@cashou/utils": "workspace:*",
    "@trpc/server": "^10.x.x",
    "better-auth": "^0.x.x"
  }
}

// apps/mobile/package.json
{
  "dependencies": {
    "@cashou/api": "workspace:*",
    "@cashou/auth": "workspace:*",  // Utilise uniquement le client
    "@cashou/ui": "workspace:*",
    "react-native": "^0.x.x"
  }
}

// apps/backoffice/package.json
{
  "dependencies": {
    "@cashou/api": "workspace:*",
    "@cashou/db-backoffice": "workspace:*",
    "@cashou/ui": "workspace:*",
    "react": "^18.x.x"
  }
}
```

### Packages spécifiques à un service

```json
// apps/backend/package.json
{
  "dependencies": {
    // Spécifique au backend seulement
    "bull": "^4.x.x",           // Queue management
    "nodemailer": "^6.x.x",     // Emails
    "stripe": "^14.x.x"         // Paiements
  }
}

// apps/mobile/package.json
{
  "dependencies": {
    // Spécifique au mobile seulement
    "react-native-push-notification": "^8.x.x",
    "react-native-async-storage": "^1.x.x",
    "@react-navigation/native": "^6.x.x"
  }
}
```

## Workflow de Développement

### Installation et setup

```bash
# Installation des dépendances
bun install

# Génération des clients Prisma
bun run db:generate

# Migrations
bun run db:migrate:app
bun run db:migrate:backoffice

# Lancement en développement
bun run dev
```

### Ajout d'un nouveau package partagé

```bash
# Créer le package
mkdir -p packages/@cashou/mon-package/src
cd packages/@cashou/mon-package

# Initialiser
bun init

# Ajouter dans une app
cd ../../../apps/backend
# Ajouter la dépendance dans package.json:
# "@cashou/mon-package": "workspace:*"
bun install
```

### Build et déploiement

```bash
# Build all apps
bun run build

# Build spécifique
bun run --filter backend build
bun run --filter backoffice build
```

## TypeScript Configuration

### tsconfig.json racine

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@cashou/*": ["./packages/*/src"]
    }
  }
}
```

### tsconfig.json par app

```json
// apps/backend/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../../packages/db-app" },
    { "path": "../../packages/auth" }
  ]
}
```

## Avantages de cette architecture

### 1. Séparation des responsabilités
- Chaque package a une responsabilité unique
- Les apps consomment uniquement ce dont elles ont besoin
- Isolation des dépendances spécifiques

### 2. Type-safety end-to-end
- Types partagés entre backend et clients
- Autocomplétion dans tous les services
- Erreurs de type détectées à la compilation

### 3. Réutilisabilité maximale
- Code partagé entre web, mobile et backend
- Configuration centralisée
- Composants UI réutilisables

### 4. Performance optimisée
- Build incrémental avec Turborepo
- Cache partagé entre CI/CD
- Tree-shaking automatique

### 5. Maintenance simplifiée
- Une seule version de chaque dépendance partagée
- Tests centralisés par package
- Migrations coordonnées

## Exemple d'utilisation Better-Auth partagé

### Côté Backend (serveur)

```typescript
// apps/backend/src/index.ts
import { auth } from '@cashou/auth/server';
import { router } from './routers';

// Utilise la configuration serveur complète
app.use('/api/auth/*', auth.handler);
```

### Côté Mobile (client uniquement)

```typescript
// apps/mobile/src/lib/auth.ts
import { createAuth } from '@cashou/auth/client';

// Utilise uniquement le client, pas le serveur
const authClient = createAuth('https://api.cashou.com');

// Dans un composant
const { signIn, signOut, session } = authClient;
```

### Côté Backoffice

```typescript
// apps/backoffice/src/lib/auth.ts
import { createClient } from '@supabase/supabase-js';

// Le backoffice utilise sa propre auth (Supabase)
// Complètement séparé de l'auth application
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
```

Cette architecture permet une flexibilité maximale tout en maintenant une cohérence et une réutilisabilité optimales.
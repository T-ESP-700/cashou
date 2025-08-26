# @cashou/auth

Package d'authentification partagé pour toutes les applications Cashou.

## Usage

### Backend (serveur)

```typescript
// Dans le backend, utilisez l'instance serveur configurée
import { auth } from '@cashou/auth/server';

// Montez le handler sur votre serveur
app.use('/api/auth/*', auth.handler);
```

### Frontend/Mobile (client)

```typescript
// Dans les apps frontend, créez un client
import { createAuth } from '@cashou/auth/client';

const authClient = createAuth('https://api.cashou.com');

// Utilisez le client
const { signIn, signOut, session } = authClient;
```

### Types

```typescript
import type { Session, User } from '@cashou/auth/types';
```

## Architecture

Ce package centralise toute la configuration Better-Auth pour éviter la duplication entre les services. Il expose :
- Une instance serveur pré-configurée avec Prisma et PostgreSQL
- Une fonction pour créer des clients auth
- Les types TypeScript partagés
# Configuration de l'Authentification Backoffice

## ✅ Ce qui a été fait

### 1. Base de Données Backoffice
- **Tables créées** dans la base PostgreSQL `backoffice` (port 5433)
- Tables : `User`, `Role`, `UserRole`
- Migration Prisma appliquée avec succès

### 2. Utilisateur Admin Créé
Un utilisateur admin a été créé dans la base de données backoffice :

```
📧 Email: admin@cashou.com
🔑 Password: Admin123456!
🆔 User ID: 1
👤 Role: admin
```

### 3. API d'Authentification Backend
- **Nouveau router** : `/apps/backend/src/routers/backoffice-auth.ts`
- Endpoints tRPC :
  - `backofficeAuth.signIn` : Connexion avec email/password
  - `backofficeAuth.verify` : Vérification du token
- Intégré dans le router principal

### 4. Service d'Authentification Frontend
- **Nouveau service** : `/apps/backoffice/src/lib/local-auth.ts`
- Gestion des tokens en localStorage
- Remplacement de Supabase Auth par une authentification locale

### 5. Composant LocalAuthGate
- **Nouveau composant** : `/apps/backoffice/src/components/auth/LocalAuthGate.tsx`
- Remplace l'ancien `AuthGate` qui utilisait Supabase
- Interface de connexion avec affichage des identifiants par défaut

## 🚀 Comment se connecter

1. **Ouvrez le backoffice** : http://localhost:5173

2. **Utilisez les identifiants** :
   - Email: `admin@cashou.com`
   - Password: `Admin123456!`

3. **Première connexion** :
   - Les identifiants sont affichés directement sur l'écran de connexion
   - Vous serez automatiquement connecté après validation

## 🔧 Scripts Utiles

### Créer un nouvel utilisateur admin

```bash
cd /Users/fgs/cashou/packages/@cashou/db-backoffice
BACKOFFICE_DB_URL="postgresql://postgres:password@localhost:5433/backoffice?schema=public" \
ADMIN_EMAIL="nouvel-admin@cashou.com" \
ADMIN_PASSWORD="MotDePasse123!" \
ADMIN_NAME="Nouvel Admin" \
bun run seed-admin.ts
```

### Régénérer le client Prisma backoffice

```bash
cd /Users/fgs/cashou/packages/@cashou/db-backoffice
BACKOFFICE_DB_URL="postgresql://postgres:password@localhost:5433/backoffice?schema=public" \
bun run generate
```

### Appliquer de nouvelles migrations

```bash
cd /Users/fgs/cashou/packages/@cashou/db-backoffice
BACKOFFICE_DB_URL="postgresql://postgres:password@localhost:5433/backoffice?schema=public" \
bun run migrate
```

## 📁 Fichiers Créés/Modifiés

### Nouveaux Fichiers
```
apps/backend/src/routers/backoffice-auth.ts
apps/backoffice/src/lib/local-auth.ts
apps/backoffice/src/components/auth/LocalAuthGate.tsx
packages/@cashou/db-backoffice/seed-admin.ts
```

### Fichiers Modifiés
```
apps/backend/src/trpc/router.ts
apps/backoffice/src/App.tsx
packages/@cashou/db-backoffice/prisma/schema.prisma
```

## 🔒 Sécurité

### ⚠️ IMPORTANT - À faire en production

1. **Changer le mot de passe admin** après la première connexion
2. **Utiliser JWT** au lieu de tokens simples base64
3. **Ajouter l'expiration des tokens**
4. **Implémenter le refresh token**
5. **Ajouter HTTPS** pour le backoffice
6. **Configurer CORS** correctement
7. **Ajouter rate limiting** sur les endpoints d'authentification
8. **Logger les tentatives de connexion**

### Token Actuel (Développement uniquement)
Le système actuel utilise un token simple en base64 :
```typescript
const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')
```

**En production**, remplacez par JWT avec `jsonwebtoken` ou `jose`.

## 🗄️ Architecture des Bases de Données

### Base Principale (cashou_db)
- **Port** : 5432
- **Usage** : Application mobile, Better Auth
- **User Model** : `id: String` (cuid)

### Base Backoffice (backoffice)
- **Port** : 5433
- **Usage** : Authentification backoffice uniquement
- **User Model** : `id: Int` (autoincrement)

## 📝 Prochaines Améliorations

1. **Gestion des rôles**
   - Définir les permissions par rôle
   - Créer des rôles : admin, editor, viewer
   - Middleware de vérification des permissions

2. **Profil utilisateur**
   - Page de profil dans le backoffice
   - Changement de mot de passe
   - Gestion des préférences

3. **Audit Log**
   - Logger toutes les actions admin
   - Tracer les modifications de données

4. **2FA (Two-Factor Authentication)**
   - Ajouter l'authentification à deux facteurs
   - SMS ou TOTP

## 🐛 Dépannage

### Le backoffice ne se connecte pas
```bash
# Vérifier que le backend est démarré
curl http://localhost:3000/health

# Vérifier que la DB backoffice est accessible
docker ps | grep backoffice

# Vérifier les logs du backend
cd /Users/fgs/cashou/apps/backend
bun src/index.ts
```

### Réinitialiser complètement l'auth backoffice
```bash
# Supprimer toutes les données de la DB backoffice
cd /Users/fgs/cashou/packages/@cashou/db-backoffice
BACKOFFICE_DB_URL="postgresql://postgres:password@localhost:5433/backoffice?schema=public" \
bunx prisma migrate reset --force

# Recréer l'admin
BACKOFFICE_DB_URL="postgresql://postgres:password@localhost:5433/backoffice?schema=public" \
bun run seed-admin.ts
```

## ✅ État Actuel

| Composant | État | URL/Info |
|-----------|------|----------|
| DB Backoffice | ✅ Running | localhost:5433 |
| Tables User/Role | ✅ Created | Migration appliquée |
| Admin User | ✅ Created | admin@cashou.com |
| Backend API Auth | ✅ Active | /api/trpc/backofficeAuth |
| Frontend Auth | ✅ Configured | LocalAuthGate |
| Backoffice UI | ✅ Ready | http://localhost:5173 |

---

**Date** : 20 novembre 2025  
**Branche** : T-47/mix  
**Statut** : ✅ Authentification opérationnelle



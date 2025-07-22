# Configuration Supabase

## Variables d'environnement requises

Créez un fichier `.env.local` à la racine du projet backoffice avec les variables suivantes :

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key-here
```

## Migration de l'ancienne configuration

- ❌ `SUPABASE_ANON_KEY` (dépréciée)
- ✅ `SUPABASE_PUBLISHABLE_KEY` (nouvelle clé)

## Service d'authentification

Le service `AuthService` dans `/src/lib/supabase.ts` fournit les méthodes suivantes :

- `signInWithEmail(email, password)` - Connexion avec email/mot de passe
- `signUpWithEmail(email, password)` - Inscription avec email/mot de passe (nécessite confirmation par email)
- `signUpWithoutEmail(email, password)` - Inscription sans envoi d'email (compte activé directement)
- `signOut()` - Déconnexion
- `getCurrentUser()` - Récupérer l'utilisateur actuel
- `getCurrentSession()` - Récupérer la session actuelle
- `onAuthStateChange(callback)` - Écouter les changements d'état

### Différence entre les méthodes d'inscription

- **`signUpWithEmail`** : Envoie un email de confirmation à l'utilisateur. Le compte doit être confirmé via email avant utilisation.
- **`signUpWithoutEmail`** : Crée et active le compte directement sans envoi d'email. Utile pour les environnements de développement ou les cas où la confirmation par email n'est pas nécessaire.

## Test de l'authentification

Un composant `AuthTest` est disponible pour tester l'authentification directement dans l'interface.

## Configuration du client Supabase

```typescript
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,     // Rafraîchissement automatique du token
    persistSession: true,       // Persistance de la session
    detectSessionInUrl: true,   // Détection de session dans l'URL
  },
});
```

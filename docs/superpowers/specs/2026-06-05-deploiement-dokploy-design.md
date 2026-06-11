# Spec — Déploiement Cashou (Mobile/EAS + VPS Dokploy)

> Date : 2026-06-05 · Branche : `T-183/déploiement`
> Statut : design + **audit de faisabilité** intégrés ; en attente de relecture finale avant plan d'implémentation.
> Révision : corrigée après audit adverse du plan (défauts B1/B2 + footguns, voir §8 et §12).

## 1. Objectif

Mettre Cashou en production sur deux fronts indépendants :

- **Chantier A — Mobile / EAS** : rattacher le projet Expo au compte personnel de l'utilisateur et préparer la configuration de build. La soumission App Store est **reportée**.
- **Chantier B — VPS / Dokploy** : déployer le `backend`, le `backoffice` et les **2 bases PostgreSQL** sur un VPS où Dokploy tourne déjà, derrière HTTPS, avec un durcissement sécurité/fiabilité issu de l'audit (section 8).

Le nom de domaine est géré par un tiers : le livrable fournit les **sous-domaines + l'IP du VPS** à transmettre au propriétaire du domaine, qui crée les enregistrements DNS.

## 2. Périmètre

**Inclus :** `apps/backend`, `apps/backoffice`, les 2 bases (`cashou_db`, `backoffice`), `apps/mobile` (config EAS + URLs prod).

**Exclu :** `apps/website` — dossier **vide** (un `package-lock.json` à 0 package, aucun code). Rien à déployer. Le site public `cashou.app`, s'il existe, est un projet séparé hors de ce repo. Soumission App Store reportée.

## 3. Décisions d'architecture (actées)

| Sujet | Décision |
|---|---|
| Compte EAS | Projet créé sous le **compte Expo personnel** de l'utilisateur (`owner` = lui). `eas init` lancé par l'utilisateur (login requis). |
| Sous-domaines | Backend → `api.<domaine>` · Backoffice → `admin.<domaine>` · Bases → **internes** (aucun sous-domaine public). |
| Stratégie Dokploy | **A** — 2 Applications Dokploy (backend, backoffice) + 2 services PostgreSQL **natifs Dokploy**. |
| Auth mobile | **Plugin Expo better-auth** (`expo()` serveur + `expoClient({scheme:'mobile'})`), CSRF **actif**, `mobile://` dans `trustedOrigins` (décision B1). |
| Déploiement backend | **Zero-downtime OFF** + **`replicas=1`** (état en mémoire, décision B2). |
| Backups DB | **Différés** : pas de S3 au lancement → **aucun backup auto** au démarrage (dette assumée, §11). |
| Mobile URLs | Pointé vers l'API prod (`https`/`wss`), via `EXPO_PUBLIC_API_URL`/`AUTH_URL` (plus de host codé en dur). |
| Secrets | Secrets commités **régénérés** et sortis du repo (gérés dans Dokploy). |

## 4. Topologie cible

```
Internet (HTTPS / WSS)
   │
   ▼  Traefik (TLS Let's Encrypt auto, géré par Dokploy)
   ├── api.<domaine>   ─► backend  (Bun :3000, HTTP + WebSocket /ws/game)  [1 réplica, no zero-downtime]
   └── admin.<domaine> ─► backoffice (nginx servant le build Vite statique)
                                │
                  réseau Docker interne (non exposé)
                                ├─► db_cashou      (PostgreSQL natif Dokploy)
                                └─► db_backoffice  (PostgreSQL natif Dokploy)

Mobile (Expo, compte perso) ──HTTPS/WSS──► api.<domaine>
```

Le **backend** est le seul service à accéder aux bases (il génère les 2 clients Prisma). Le **backoffice** est une **SPA statique** qui ne parle qu'au backend via `api.<domaine>`.

## 5. Composants & changements

### A. Mobile / EAS
- `apps/mobile/app.json` : retirer `"owner": "soso7"` et la valeur `projectId`. L'utilisateur lance ensuite `cd apps/mobile && eas init` (compte perso) → EAS réécrit `owner` + nouveau `projectId`.
- `apps/mobile/eas.json` (actuellement **vide**) : profils `development` / `preview` / `production`, `appVersionSource: remote`. **Pas** de bloc `submit` App Store pour l'instant.
- `apps/mobile/lib/api-config.ts` : **lire `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_AUTH_URL`** (déjà dans `.env`) au lieu du host codé en dur `api.cashou.com` ; en prod, `https`/`wss` **sans port**. → un seul endroit (le `.env`) pilote le domaine (footgun #1).
- `apps/mobile/lib/auth.ts` : remplacer `better-auth/client` générique par **`@better-auth/expo` client** (`expoClient({ scheme: 'mobile', storage: SecureStore })`) — requis pour que le CSRF passe (B1).
- `apps/mobile/lib/game-socket.ts` : URL WS → `wss://api.<domaine>/ws/game` ; **redemander un ticket WS à chaque (re)connexion** (cf. 8.S4, footgun #2) → `connectGameSocket` devient async.
- `apps/mobile/.env` : valeurs prod (`https`/`wss`) ; documenter la valeur LAN pour le dev.

### B. Backend — Application Dokploy
- `apps/backend/Dockerfile.prod` (nouveau) : basé sur l'actuel **sans `COPY .env.docker`**, `NODE_ENV=production`, lancement direct (`bun run`, pas de `--watch`), génération des 2 clients Prisma. **Conserver la CLI Prisma** dans l'image (pas de `bun install --production`, prisma est devDep) — requise pour les migrations au boot (footgun #3).
- **Entrypoint migrations** : `prisma migrate deploy` sur les 2 bases **avant** de démarrer le serveur ; échec migration ⇒ conteneur ne démarre pas.
- `packages/@cashou/auth/src/server.ts` : ajouter le **plugin serveur `expo()`** ; `trustedOrigins` pilotés par env = `[https://admin.<domaine>, https://api.<domaine>, mobile://]` ; **ne plus** forcer `disableCSRFCheck` en prod ; bcrypt → 12 (8.S9).
- Binding déjà correct (`0.0.0.0:3000`, `index.ts:40`). Domaine Dokploy → `api.<domaine>` ; Traefik route HTTP **et** WebSocket.
- **Dokploy : `replicas=1` + zero-downtime désactivé** (B2). `/health` requis par Swarm (→ R4).

### C. Backoffice — Application Dokploy
- `apps/backoffice/Dockerfile.prod` (nouveau) : **multi-stage** — (1) `vite build` avec **build-arg `VITE_BACKEND_URL=https://api.<domaine>`** (confirmé : Dokploy « Build Time Arguments ») ; (2) **nginx** sert `dist/` avec *fallback SPA* (`try_files … /index.html`), gzip, cache.
- Domaine Dokploy → `admin.<domaine>`.
- Vérifier l'usage réel de `VITE_SUPABASE_*` ; si vestigial, retirer.

### D. Bases — PostgreSQL natifs Dokploy
- `db_cashou` (base `cashou_db`) et `db_backoffice` (base `backoffice`), volumes persistants. Backups : **différés** (pas de S3 au lancement, §11).
- Le backend reçoit `CASHOU_DB_URL` / `BACKOFFICE_DB_URL` (hôtes internes Dokploy).

## 6. Variables d'environnement & secrets

| Variable | Service | Note |
|---|---|---|
| `BETTER_AUTH_SECRET` | backend | **Régénéré** (l'actuel est commité/compromis) |
| `BACKOFFICE_TOKEN_SECRET` | backend | **Requis** + fort (8.S3) |
| `POSTGRES_PASSWORD` ×2 | bases | **Régénérés** forts |
| `CASHOU_DB_URL` / `BACKOFFICE_DB_URL` | backend | Hôtes internes Dokploy |
| `BETTER_AUTH_URL` | backend | `https://api.<domaine>` |
| `TRUSTED_ORIGINS` / `ALLOWED_ORIGINS` | backend | `https://admin.<domaine>`, `https://api.<domaine>`, `mobile://` |
| `NODE_ENV` | backend | `production` |
| `VITE_BACKEND_URL` | backoffice | **build-arg** `https://api.<domaine>` |
| `EXPO_PUBLIC_API_URL` / `_AUTH_URL` | mobile (build) | `https://api.<domaine>/api/...` (fige le domaine **avant** build, footgun #1) |

- `.env.docker` (commité, secrets en clair) → remplacé par **`.env.docker.example`** (placeholders) + ajout au `.gitignore`. Secrets réels **dans Dokploy uniquement**. Anciens secrets compromis (historique git) → rotation.
- **Footgun #6** : les Dockerfile **dev** font `COPY .env.docker` → si on gitignore le fichier, documenter « copier `.env.docker.example` → `.env.docker` avant le build dev » (ou retirer ce `COPY` du dev).

## 7. Réseau & flux

- **TLS** : Traefik obtient/renouvelle Let's Encrypt dès qu'un domaine est ajouté.
- **WebSocket** : `wss://api.<domaine>/ws/game` ; upgrade géré par Traefik ; ouverture avec **ticket éphémère** (8.S4).
- **DNS (handoff)** au propriétaire du domaine :
  ```
  api.<domaine>     A   <IP_DU_VPS>
  admin.<domaine>   A   <IP_DU_VPS>
  ```

## 8. Durcissement obligatoire (issu de l'audit)

Périmètre : **tous les findings sécurité (S1–S9)** + **R4** + bloquants archi (B1, B2, R1/R2).

### Bloquants
- **B1 — CSRF cassait l'auth mobile.** En prod `NODE_ENV=production` réactive le CSRF (`auth/server.ts:37`) ; le mobile en `better-auth/client` générique n'envoie pas d'`Origin` → rejet. **Correction** : plugin Expo (`expo()` serveur + `expoClient` mobile) + `mobile://` dans `trustedOrigins`. **À tester** : login mobile en prod avec CSRF actif.
- **B2 — Zero-downtime Swarm dédoublait l'instance.** Dokploy = Docker Swarm ; zero-downtime = start-first (2 instances en parallèle) ; état en mémoire (`ws/game-socket.ts:22,25`, pg-boss) ⇒ double tick / rooms scindées. **Correction** : zero-downtime **OFF** + `replicas=1` ; coupure de quelques secondes par déploiement acceptée (reconnexion WS existante).
- **S3 — Secret admin codé en dur.** `lib/backoffice-token.ts:3` fallback `'cashou-backoffice-secret'` jamais surchargé → forge de token admin. → `BACKOFFICE_TOKEN_SECRET` **requis**, **fail-fast** au boot ; secret fort Dokploy.
- **S5 / G1 — Credentials loggés en clair.** `index.ts:111-122` logge le body `/api/auth` (mots de passe, emails). → **Supprimer** ; logger méthode + status + messages génériques (jamais l'objet `Error`, `index.ts:133`).
- **S1 / S2 — CORS et trustedOrigins en `*`.** → CORS par **reflection** : echo de l'`Origin` si dans l'allowlist + `Vary: Origin` (footgun #4) ; `trustedOrigins` restreints (§6).
- **S6 — Bases exposées + creds faibles.** `docker-compose.yml:8-9,24-25` + `postgres/password`. → En prod : **aucun port DB publié** (interne) + mots de passe forts.
- **R1 / R2 — État WS/ticker en mémoire.** → backend **1 réplica** (cf. B2), non scalable horizontalement en l'état (documenté §11).
- **Transport** — Mobile `http`/`ws`:3000 en prod. → `https`/`wss` sans port (5.A).

### Sécurité (autres, inclus)
- **S4 — Token de session dans l'URL du WS** (`index.ts:54`). → **Ticket WS éphémère** : procédure tRPC protégée émettant un ticket court (~30 s, usage unique) ; `wss://…/ws/game?ticket=…` ; backend valide et consomme (store en mémoire, cohérent car mono-instance). **Le client redemande un ticket à chaque (re)connexion** (footgun #2).
- **S7 — Clients Prisma multiples** (`trpc/index.ts`, `backoffice-auth.ts:13`). → **singletons** (un client app, un client backoffice).
- **S8 — Aucun rate limiting.** → **middleware Traefik `rateLimit`** (via file provider — pas d'UI Dokploy) sur `api.<domaine>` (au moins `/api/auth` + signIn backoffice).
- **S9 — bcrypt cost 10** → **12** (n'invalide pas les hash existants : le coût est encodé dans le hash).

### Fiabilité (R4 inclus)
- **R4 — `/health` superficiel** (`index.ts:94-95`). → Healthcheck **profond** : ping DB (timeout court) + état job-queue ; requis par Swarm pour le déploiement. Couvre la *visibilité* de R3 (footgun #5 : éviter le crash-loop si DB lente au boot).

### Différés (hors lot, tracés)
- R3 (fail-fast job-queue), R7 (drain WS — Dokploy ne règle pas `stop_grace_period`), R9 (charge pg-boss sur `cashou_db`).
- **G2 backups** : **aucun backup auto au lancement** (pas de S3) → à brancher dès qu'une destination S3 (AWS/MinIO/B2) existe ; chiffrés + hors-VPS + rétention.
- G3 : politique de confidentialité (App Store) — chantier séparé, lié à `AUDIT-GOALS.md`.

## 9. Livrables

1. Backend : `Dockerfile.prod`, entrypoint migrations, plugin `expo()`, CORS reflection, `/health` profond, Prisma singletons, bcrypt 12, ticket WS, fail-fast `BACKOFFICE_TOKEN_SECRET`.
2. Backoffice : `Dockerfile.prod` multi-stage + `nginx.conf`.
3. Mobile : `app.json`, `eas.json`, `api-config.ts` (via `EXPO_PUBLIC_*`), `auth.ts` (client Expo), `game-socket.ts` (ticket + reconnect), `.env`.
4. `.env.docker.example` + `.gitignore` + doc workflow dev.
5. Conf Dokploy/Traefik : `replicas=1`, zero-downtime OFF, middleware `rateLimit` (file provider).
6. `TUTO-DEPLOIEMENT-DOKPLOY.md` : guide pas-à-pas (2 DB, 2 Apps, build-args, domaines, rate limit, ordre des opérations, **rappel : figer le domaine avant les builds**), style `TUTO-DEPLOIEMENT-IOS.md`.

## 10. Critères de succès

- `https://api.<domaine>` répond ; **login mobile OK avec CSRF actif** ; `wss://api.<domaine>/ws/game` fonctionne via ticket (y compris après reconnexion) ; backend connecté aux 2 bases ; migrations appliquées.
- `https://admin.<domaine>` se charge et dialogue avec le backend.
- Bases persistantes, **non exposées** publiquement ; déploiement sans overlap d'instance (1 réplica, zero-downtime OFF).
- Mobile rattaché au compte Expo perso ; `eas.json` prêt ; URLs prod en `https`/`wss` pilotées par `.env`.
- **Aucun secret en clair** ; `BACKOFFICE_TOKEN_SECRET` requis ; CORS/trustedOrigins restreints ; rate limiting actif ; `/health` profond.

## 11. Risques & hypothèses

- **Mono-instance** : pas de HA backend tant que l'état WS/ticker n'est pas externalisé (Redis/pub-sub) — accepté. Corollaire : **~quelques secondes de coupure à chaque déploiement** (zero-downtime OFF) — accepté.
- **Pas de backup automatique au lancement** (pas de S3) → **risque de perte de données assumé**. Dette à résorber en priorité post-lancement.
- **Migrations au boot** : sûr en mono-instance ; à revoir si multi-instance.
- **CSRF/mobile** : validé sur doc, **à confirmer par un test réel** du login mobile en prod.
- **Domaine tiers** : sa valeur doit être **figée avant** les builds (mobile + backoffice + `BETTER_AUTH_URL`).

## 12. Faisabilité vérifiée (audit du plan)

| Hypothèse | Statut | Source |
|---|---|---|
| Dokploy DB natives + backups S3 (cron, rétention, `pg_dump`+`rclone`) | ✅ Confirmé (exige une destination S3) | docs.dokploy.com/docs/core/backups |
| Build-args Dockerfile (« Build Time Arguments ») + build secrets | ✅ Confirmé | docs.dokploy.com/docs/core/applications/build-type |
| Rate-limit Traefik (via file provider, pas d'UI) | ✅ Confirmé | docs.dokploy.com (domains / traefik) |
| Dokploy = Docker Swarm ; zero-downtime = start-first (overlap) | ✅ Confirmé → B2 | docs.dokploy.com/docs/core/applications/zero-downtime |
| better-auth rejette les origines non fiables ; plugin Expo requis pour le mobile | ✅ Confirmé → B1 | docs better-auth (security.mdx, expo) |

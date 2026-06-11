# Tuto — Déployer Cashou sur Dokploy (VPS)

> Adapté à **ton** infra réelle.
> - **VPS** : `57.129.121.244`
> - **Dashboard Dokploy** : `http://57.129.121.244:3000` (installé le 2026-06-11)
> - **Backend** : `https://api.tang0.org`
> - **Backoffice** : `https://admin.tang0.org`
> - **DNS** : déjà OK (les 2 sous-domaines pointent sur l'IP).
>
> Dokploy est **déjà installé et sain** (Swarm actif, Traefik sur 80/443). Tu pilotes le
> dashboard (clic-à-clic), je t'assiste en direct.

---

## État du serveur (fait)

- ✅ **Dokploy installé** : dashboard sur `http://57.129.121.244:3000`.
- ⏸️ **Mis de côté pour libérer 80/443** : Superset (`chartsgouvpaca`) et `flowdon` ont été **arrêtés** (pas supprimés). Pour les **restaurer** plus tard :
  ```bash
  # Superset
  docker compose -f /home/ubuntu/chartsgouvpaca/docker-compose.prod.yml up -d
  # flowdon (⚠️ son Caddy voudra 80/443, déjà pris par Traefik/Dokploy → à reconfigurer avant)
  docker compose -f /home/ubuntu/flowdon/docker-compose.yml up -d
  ```

---

## Étape 0bis — Créer ton compte admin Dokploy (À FAIRE MAINTENANT)

Ouvre **`http://57.129.121.244:3000`** et crée ton compte admin **tout de suite** :
le premier visiteur du dashboard devient administrateur, donc ne laisse pas ce port ouvert
sans compte. (Active aussi la 2FA dans Dokploy ensuite.)

---

## Étape 0 — Pré-requis : pousser le code durci sur Git

Dokploy **construit depuis ton dépôt Git**. Les correctifs de sécurité/déploiement doivent donc
être **commités et poussés** sur la branche que Dokploy va suivre (ex. `T-183/déploiement` ou `main`).

```bash
git add -A
git commit -m "Durcissement + config déploiement prod"
git push origin T-183/déploiement
```

> Tant que ce n'est pas poussé, Dokploy déploierait l'ancien code (avec les failles).

---

## Étape 1 — Générer les secrets (à garder en lieu sûr, jamais dans Git)

```bash
openssl rand -hex 32   # → BETTER_AUTH_SECRET
openssl rand -hex 32   # → BACKOFFICE_TOKEN_SECRET
openssl rand -hex 24   # → mot de passe Postgres (x2, un par base)
```

Note les 4 valeurs, tu les colleras dans Dokploy.

---

## Étape 2 — Créer le projet Dokploy

Dans Dokploy → **Create Project** → nom `cashou`. Tout ce qui suit va dans ce projet.

---

## Étape 3 — Les 2 bases PostgreSQL (services natifs Dokploy)

Pour **chacune** : projet `cashou` → **Create Service → Database → PostgreSQL**.

| | Base APP | Base BACKOFFICE |
|---|---|---|
| Name | `db-cashou` | `db-backoffice` |
| Database Name | `cashou_db` | `backoffice` |
| User | `postgres` | `postgres` |
| Password | (1er `openssl` ci-dessus) | (2e `openssl`) |

- **Ne PAS** publier de port externe (laisse les bases **internes**).
- Déploie chaque base, puis ouvre son onglet et **copie l'« Internal Connection URL »**
  (de la forme `postgresql://postgres:****@<hôte-interne>:5432/<db>`). Tu en as besoin à l'étape 5.

> Backups : **non configurés** pour l'instant (pas de S3). À brancher dès que possible
> (onglet *Backups* de chaque base + une destination S3). Dette assumée au lancement.

---

## Étape 4 — Application BACKEND (`api.tang0.org`)

Projet `cashou` → **Create Service → Application**.

**Source** : ton dépôt GitHub `T-ESP-700/cashou`, branche poussée à l'étape 0.

**Build** :
- Build Type : **Dockerfile**
- Docker File : `apps/backend/Dockerfile.prod`
- Docker Context Path : `.` (racine du monorepo)

**Environment** (onglet Environment) :
```
NODE_ENV=production
PORT=3000
CASHOU_DB_URL=<Internal Connection URL de db-cashou>
BACKOFFICE_DB_URL=<Internal Connection URL de db-backoffice>
BETTER_AUTH_URL=https://api.tang0.org
BETTER_AUTH_SECRET=<1er openssl rand -hex 32>
BACKOFFICE_TOKEN_SECRET=<2e openssl rand -hex 32>
TRUSTED_ORIGINS=https://admin.tang0.org,https://api.tang0.org
ALLOWED_ORIGINS=https://admin.tang0.org
```

**Domain** (onglet Domains) :
- Host : `api.tang0.org`
- Container Port : `3000`
- HTTPS : **activé** (Let's Encrypt) → Traefik génère le certificat automatiquement.

**Advanced / Cluster** :
- **Replicas : 1** (obligatoire — état WebSocket/ticker en mémoire).
- **Zero-downtime : DÉSACTIVÉ** (sinon Swarm fait tourner 2 instances en parallèle → double ticker).
- **Health check path : `/health`**.

---

## Étape 5 — Application BACKOFFICE (`admin.tang0.org`)

Projet `cashou` → **Create Service → Application**. Même dépôt/branche.

**Build** :
- Build Type : **Dockerfile**
- Docker File : `apps/backoffice/Dockerfile.prod`
- Docker Context Path : `.`
- **Build Time Arguments** (onglet Environment → Build Args) :
  ```
  VITE_BACKEND_URL=https://api.tang0.org
  ```
  ⚠️ C'est un **build-arg** (Vite l'inline au build), pas une variable runtime.

**Domain** :
- Host : `admin.tang0.org`
- Container Port : `80` (nginx)
- HTTPS : **activé**.

**Advanced** : replicas 1 suffit (statique). Pas besoin de health spécifique.

---

## Étape 6 — Ordre de déploiement

1. **Déployer les 2 bases** d'abord (elles doivent être *up* avant le backend).
2. **Déployer le backend** : à son boot, l'entrypoint applique les migrations Prisma des 2 bases,
   puis démarre. Regarde les logs : tu dois voir « Migrations base APP… », « …BACKOFFICE… », puis
   « Démarrage du backend ».
3. **Déployer le backoffice**.

---

## Étape 7 — Vérifications

```bash
# Santé backend (doit renvoyer {"status":"ok","db":"ok","queue":"ok"})
curl https://api.tang0.org/health

# Backoffice charge
curl -I https://admin.tang0.org
```

Puis, fonctionnel :
- **Login backoffice** sur `https://admin.tang0.org`.
- **Login mobile + partie en temps réel** (WebSocket via ticket) — c'est le **jalon de validation**
  du CSRF/mobile en conditions réelles (cf. spec). Le mobile natif n'envoie pas d'Origin → better-auth
  reste permissif, le login doit passer.

---

## Étape 8 — Rate limiting (anti brute-force) via Traefik

Dokploy n'a pas (encore) d'UI middleware → on passe par la conf fichier de Traefik.
Ajoute un middleware `rateLimit` et applique-le au routeur de `api.tang0.org` (au moins sur
`/api/auth`). Exemple de middleware :

```yaml
http:
  middlewares:
    cashou-ratelimit:
      rateLimit:
        average: 100
        burst: 50
        period: 1m
```

(À placer dans le dynamic config Traefik de Dokploy, puis référencer le middleware sur l'app backend.)

---

## Rappels importants (dette assumée)

- **Backend mono-instance** : pas de haute dispo ; ~quelques secondes de coupure à chaque
  redéploiement (les clients WebSocket se reconnectent tout seuls).
- **Aucun backup automatique** au lancement (pas de S3) → **à brancher en priorité**.
- Secrets **uniquement dans Dokploy** (jamais commités). L'ancien `.env.docker` est désormais
  gitignoré ; pense à `git rm --cached .env.docker` et à **faire tourner** les anciens secrets
  (ils sont dans l'historique Git).

---

## Récap « qui sert à quoi »

| Élément | Rôle |
|---|---|
| `db-cashou`, `db-backoffice` (Dokploy DB) | Données, internes au VPS |
| App **backend** (`api.tang0.org`) | API tRPC + auth + WebSocket, parle aux 2 bases |
| App **backoffice** (`admin.tang0.org`) | SPA statique (nginx), parle au backend |
| `Dockerfile.prod` (x2) | Builds de prod (sans secret cuit) |
| Traefik (Dokploy) | TLS auto + routage + rate limit |

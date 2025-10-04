# Documentation API Cashou

## Vue d'ensemble

L'API Cashou est construite avec **tRPC** et **Bun**, offrant une API type-safe pour la gestion des marchés financiers, actifs, événements et impacts. Toutes les routes sont accessibles via le préfixe `/trpc`.

**Base URL**: `http://localhost:3000/trpc`

## Architecture des routes

L'API est organisée en 9 modules principaux :
- **Level** - Gestion des niveaux
- **Market** - Gestion des marchés
- **Submarket** - Gestion des sous-marchés
- **Field** - Gestion des champs
- **Asset** - Gestion des actifs
- **Event** - Gestion des événements
- **AssetHistory** - Historique des actifs
- **EventAsset** - Relations événements-actifs
- **Impact** - Gestion des impacts

---

## 1. Level Routes (`/trpc/level`)

### `getAll`
- **Méthode**: GET
- **Description**: Récupère tous les niveaux
- **Paramètres**: Aucun
- **Exemple**: `GET /trpc/level.getAll`

### `getById`
- **Méthode**: GET
- **Description**: Récupère un niveau par son ID
- **Paramètres**: `{id: number}`
- **Exemple**: `GET /trpc/level.getById?input={"id":1}`

### `create`
- **Méthode**: POST
- **Description**: Crée un nouveau niveau
- **Paramètres**: `LevelCreateSchema`
- **Exemple**: `POST /trpc/level.create`

### `update`
- **Méthode**: POST
- **Description**: Met à jour un niveau existant
- **Paramètres**: `LevelUpdateSchema`
- **Exemple**: `POST /trpc/level.update`

### `delete`
- **Méthode**: POST
- **Description**: Supprime un niveau
- **Paramètres**: `{id: number}`
- **Exemple**: `POST /trpc/level.delete`

---

## 2. Market Routes (`/trpc/market`)

### Routes CRUD de base

#### `getAll`
- **Méthode**: GET
- **Description**: Récupère tous les marchés
- **Paramètres**: Aucun
- **Exemple**: `GET /trpc/market.getAll`

#### `getById`
- **Méthode**: GET
- **Description**: Récupère un marché par son ID
- **Paramètres**: `{id: number}`
- **Exemple**: `GET /trpc/market.getById?input={"id":1}`

#### `create`
- **Méthode**: POST
- **Description**: Crée un nouveau marché
- **Paramètres**: `MarketCreateSchema`
- **Exemple**: `POST /trpc/market.create`

#### `update`
- **Méthode**: POST
- **Description**: Met à jour un marché existant
- **Paramètres**: `MarketUpdateSchema`
- **Exemple**: `POST /trpc/market.update`

#### `delete`
- **Méthode**: POST
- **Description**: Supprime un marché
- **Paramètres**: `{id: number}`
- **Exemple**: `POST /trpc/market.delete`

### Routes métiers avancées

#### `list`
- **Méthode**: GET
- **Description**: Liste paginée des marchés avec compteurs
- **Paramètres**: `PaginationSchema` (limit, offset)
- **Exemple**: `GET /trpc/market.list?input={"limit":20,"offset":0}`

#### `search`
- **Méthode**: GET
- **Description**: Recherche de marchés par mots-clés et tendances
- **Paramètres**: `MarketSearchSchema` (query, tag, trend)
- **Exemple**: `GET /trpc/market.search?input={"query":"tech","tag":"innovation","trend":"hausse"}`

#### `getTree`
- **Méthode**: GET
- **Description**: Arbre complet d'un marché (marché + sous-marchés + compteurs d'actifs)
- **Paramètres**: `{marketId: number}`
- **Exemple**: `GET /trpc/market.getTree?input={"marketId":1}`

#### `getOverview`
- **Méthode**: GET
- **Description**: Vue d'ensemble complète d'un marché avec KPIs
- **Paramètres**: `{marketId: number}`
- **Exemple**: `GET /trpc/market.getOverview?input={"marketId":1}`

#### `getSnapshot`
- **Méthode**: GET
- **Description**: Snapshot temps réel d'un marché
- **Paramètres**: `{marketId: number}`
- **Exemple**: `GET /trpc/market.getSnapshot?input={"marketId":1}`

#### `getHistory`
- **Méthode**: GET
- **Description**: Historique agrégé d'un marché sur une période
- **Paramètres**: `{marketId: number, from: string, to: string}`
- **Exemple**: `GET /trpc/market.getHistory?input={"marketId":1,"from":"2024-01-01","to":"2024-01-31"}`

#### `getHeatmap`
- **Méthode**: GET
- **Description**: Carte thermique d'un marché
- **Paramètres**: `{marketId: number, metric: 'performance' | 'volume' | 'volatility' | 'risk'}`
- **Exemple**: `GET /trpc/market.getHeatmap?input={"marketId":1,"metric":"performance"}`

---

## 3. Submarket Routes (`/trpc/submarket`)

### `getAll`
- **Méthode**: GET
- **Description**: Récupère tous les sous-marchés
- **Paramètres**: Aucun
- **Exemple**: `GET /trpc/submarket.getAll`

### `getById`
- **Méthode**: GET
- **Description**: Récupère un sous-marché par son ID
- **Paramètres**: `{id: number}`
- **Exemple**: `GET /trpc/submarket.getById?input={"id":1}`

### `getByMarketId`
- **Méthode**: GET
- **Description**: Récupère tous les sous-marchés d'un marché spécifique
- **Paramètres**: `{marketId: number}`
- **Exemple**: `GET /trpc/submarket.getByMarketId?input={"marketId":1}`

### `create`
- **Méthode**: POST
- **Description**: Crée un nouveau sous-marché
- **Paramètres**: `SubmarketCreateSchema`
- **Exemple**: `POST /trpc/submarket.create`

### `update`
- **Méthode**: POST
- **Description**: Met à jour un sous-marché existant
- **Paramètres**: `SubmarketUpdateSchema`
- **Exemple**: `POST /trpc/submarket.update`

### `delete`
- **Méthode**: POST
- **Description**: Supprime un sous-marché
- **Paramètres**: `{id: number}`
- **Exemple**: `POST /trpc/submarket.delete`

---

## 4. Field Routes (`/trpc/field`)

### `getAll`
- **Méthode**: GET
- **Description**: Récupère tous les champs
- **Paramètres**: Aucun
- **Exemple**: `GET /trpc/field.getAll`

### `getById`
- **Méthode**: GET
- **Description**: Récupère un champ par son ID
- **Paramètres**: `{id: number}`
- **Exemple**: `GET /trpc/field.getById?input={"id":1}`

### `getByMarketId`
- **Méthode**: GET
- **Description**: Récupère tous les champs d'un marché spécifique
- **Paramètres**: `{marketId: number}`
- **Exemple**: `GET /trpc/field.getByMarketId?input={"marketId":1}`

### `create`
- **Méthode**: POST
- **Description**: Crée un nouveau champ
- **Paramètres**: `FieldCreateSchema`
- **Exemple**: `POST /trpc/field.create`

### `update`
- **Méthode**: POST
- **Description**: Met à jour un champ existant
- **Paramètres**: `FieldUpdateSchema`
- **Exemple**: `POST /trpc/field.update`

### `delete`
- **Méthode**: POST
- **Description**: Supprime un champ
- **Paramètres**: `{id: number}`
- **Exemple**: `POST /trpc/field.delete`

---

## 5. Asset Routes (`/trpc/asset`)

### `getAll`
- **Méthode**: GET
- **Description**: Récupère tous les actifs
- **Paramètres**: Aucun
- **Exemple**: `GET /trpc/asset.getAll`

### `getById`
- **Méthode**: GET
- **Description**: Récupère un actif par son ID
- **Paramètres**: `{id: number}`
- **Exemple**: `GET /trpc/asset.getById?input={"id":1}`

### `getByMarketId`
- **Méthode**: GET
- **Description**: Récupère tous les actifs d'un marché spécifique
- **Paramètres**: `{marketId: number}`
- **Exemple**: `GET /trpc/asset.getByMarketId?input={"marketId":1}`

### `getBySubmarketId`
- **Méthode**: GET
- **Description**: Récupère tous les actifs d'un sous-marché spécifique
- **Paramètres**: `{submarketId: number}`
- **Exemple**: `GET /trpc/asset.getBySubmarketId?input={"submarketId":1}`

### `create`
- **Méthode**: POST
- **Description**: Crée un nouvel actif
- **Paramètres**: `AssetCreateSchema`
- **Exemple**: `POST /trpc/asset.create`

### `update`
- **Méthode**: POST
- **Description**: Met à jour un actif existant
- **Paramètres**: `AssetUpdateSchema`
- **Exemple**: `POST /trpc/asset.update`

### `delete`
- **Méthode**: POST
- **Description**: Supprime un actif
- **Paramètres**: `{id: number}`
- **Exemple**: `POST /trpc/asset.delete`

---

## 6. Event Routes (`/trpc/event`)

### `getAll`
- **Méthode**: GET
- **Description**: Récupère tous les événements
- **Paramètres**: Aucun
- **Exemple**: `GET /trpc/event.getAll`

### `getById`
- **Méthode**: GET
- **Description**: Récupère un événement par son ID
- **Paramètres**: `{id: number}`
- **Exemple**: `GET /trpc/event.getById?input={"id":1}`

### `create`
- **Méthode**: POST
- **Description**: Crée un nouvel événement
- **Paramètres**: `EventCreateSchema`
- **Exemple**: `POST /trpc/event.create`

### `update`
- **Méthode**: POST
- **Description**: Met à jour un événement existant
- **Paramètres**: `EventUpdateSchema`
- **Exemple**: `POST /trpc/event.update`

### `delete`
- **Méthode**: POST
- **Description**: Supprime un événement
- **Paramètres**: `{id: number}`
- **Exemple**: `POST /trpc/event.delete`

---

## 7. Asset History Routes (`/trpc/assetHistory`)

### `getAll`
- **Méthode**: GET
- **Description**: Récupère tout l'historique des actifs
- **Paramètres**: Aucun
- **Exemple**: `GET /trpc/assetHistory.getAll`

### `getById`
- **Méthode**: GET
- **Description**: Récupère un historique d'actif par son ID
- **Paramètres**: `{id: number}`
- **Exemple**: `GET /trpc/assetHistory.getById?input={"id":1}`

### `getByAssetId`
- **Méthode**: GET
- **Description**: Récupère tout l'historique d'un actif spécifique
- **Paramètres**: `{assetId: number}`
- **Exemple**: `GET /trpc/assetHistory.getByAssetId?input={"assetId":1}`

### `getByAssetIdAndPeriod`
- **Méthode**: GET
- **Description**: Récupère l'historique d'un actif dans une période donnée
- **Paramètres**: `{assetId: number, startDate: string, endDate: string}`
- **Exemple**: `GET /trpc/assetHistory.getByAssetIdAndPeriod?input={"assetId":1,"startDate":"2024-01-01","endDate":"2024-12-31"}`

### `getLatestByAssetId`
- **Méthode**: GET
- **Description**: Récupère la valeur la plus récente d'un actif
- **Paramètres**: `{assetId: number}`
- **Exemple**: `GET /trpc/assetHistory.getLatestByAssetId?input={"assetId":1}`

### `create`
- **Méthode**: POST
- **Description**: Crée un nouvel historique d'actif
- **Paramètres**: `AssetHistoryCreateSchema`
- **Exemple**: `POST /trpc/assetHistory.create`

### `update`
- **Méthode**: POST
- **Description**: Met à jour un historique d'actif existant
- **Paramètres**: `AssetHistoryUpdateSchema`
- **Exemple**: `POST /trpc/assetHistory.update`

### `delete`
- **Méthode**: POST
- **Description**: Supprime un historique d'actif
- **Paramètres**: `{id: number}`
- **Exemple**: `POST /trpc/assetHistory.delete`

---

## 8. Event Asset Routes (`/trpc/eventAsset`)

### `getAll`
- **Méthode**: GET
- **Description**: Récupère tous les événements d'actifs
- **Paramètres**: Aucun
- **Exemple**: `GET /trpc/eventAsset.getAll`

### `getById`
- **Méthode**: GET
- **Description**: Récupère un événement d'actif par son ID
- **Paramètres**: `{id: number}`
- **Exemple**: `GET /trpc/eventAsset.getById?input={"id":1}`

### `getByAssetId`
- **Méthode**: GET
- **Description**: Récupère tous les événements d'actifs d'un actif spécifique
- **Paramètres**: `{assetId: number}`
- **Exemple**: `GET /trpc/eventAsset.getByAssetId?input={"assetId":1}`

### `getByEventId`
- **Méthode**: GET
- **Description**: Récupère tous les événements d'actifs d'un événement spécifique
- **Paramètres**: `{eventId: number}`
- **Exemple**: `GET /trpc/eventAsset.getByEventId?input={"eventId":1}`

### `getByPeriod`
- **Méthode**: GET
- **Description**: Récupère les événements d'actifs dans une période donnée
- **Paramètres**: `{startDate: string, endDate: string}`
- **Exemple**: `GET /trpc/eventAsset.getByPeriod?input={"startDate":"2024-01-01","endDate":"2024-12-31"}`

### `create`
- **Méthode**: POST
- **Description**: Crée un nouvel événement d'actif
- **Paramètres**: `EventAssetCreateSchema`
- **Exemple**: `POST /trpc/eventAsset.create`

### `update`
- **Méthode**: POST
- **Description**: Met à jour un événement d'actif existant
- **Paramètres**: `EventAssetUpdateSchema`
- **Exemple**: `POST /trpc/eventAsset.update`

### `delete`
- **Méthode**: POST
- **Description**: Supprime un événement d'actif
- **Paramètres**: `{id: number}`
- **Exemple**: `POST /trpc/eventAsset.delete`

---

## 9. Impact Routes (`/trpc/impact`)

### `getAll`
- **Méthode**: GET
- **Description**: Récupère tous les impacts
- **Paramètres**: Aucun
- **Exemple**: `GET /trpc/impact.getAll`

### `getById`
- **Méthode**: GET
- **Description**: Récupère un impact par son ID
- **Paramètres**: `{id: number}`
- **Exemple**: `GET /trpc/impact.getById?input={"id":1}`

### `getByEventId`
- **Méthode**: GET
- **Description**: Récupère tous les impacts d'un événement spécifique
- **Paramètres**: `{eventId: number}`
- **Exemple**: `GET /trpc/impact.getByEventId?input={"eventId":1}`

### `getByFieldId`
- **Méthode**: GET
- **Description**: Récupère tous les impacts d'un champ spécifique
- **Paramètres**: `{fieldId: number}`
- **Exemple**: `GET /trpc/impact.getByFieldId?input={"fieldId":1}`

### `getBySubmarketId`
- **Méthode**: GET
- **Description**: Récupère tous les impacts d'un sous-marché spécifique
- **Paramètres**: `{submarketId: number}`
- **Exemple**: `GET /trpc/impact.getBySubmarketId?input={"submarketId":1}`

### `getByMinCoefficient`
- **Méthode**: GET
- **Description**: Récupère les impacts avec un coefficient supérieur à une valeur donnée
- **Paramètres**: `{minCoef: number}`
- **Exemple**: `GET /trpc/impact.getByMinCoefficient?input={"minCoef":5}`

### `create`
- **Méthode**: POST
- **Description**: Crée un nouvel impact
- **Paramètres**: `ImpactCreateSchema`
- **Exemple**: `POST /trpc/impact.create`

### `update`
- **Méthode**: POST
- **Description**: Met à jour un impact existant
- **Paramètres**: `ImpactUpdateSchema`
- **Exemple**: `POST /trpc/impact.update`

### `delete`
- **Méthode**: POST
- **Description**: Supprime un impact
- **Paramètres**: `{id: number}`
- **Exemple**: `POST /trpc/impact.delete`

---

## Routes système

### Route d'accueil
- **URL**: `/`
- **Méthode**: GET
- **Description**: Vérification que le serveur fonctionne
- **Réponse**: `"Cashou backend"`

---

## Notes importantes

### Format des requêtes tRPC
- **GET requests**: Les paramètres sont passés via le query string avec `?input={...}`
- **POST requests**: Les paramètres sont passés dans le body de la requête
- **Validation**: Toutes les entrées sont automatiquement validées via Zod schemas

### Types de données
- Tous les IDs sont des nombres entiers positifs
- Les dates sont au format ISO string (`YYYY-MM-DD`)
- Les métriques de carte thermique sont limitées aux valeurs : `'performance'`, `'volume'`, `'volatility'`, `'risk'`

### Gestion d'erreurs
- L'API retourne des erreurs HTTP appropriées (400, 404, 500)
- Les erreurs de validation sont automatiquement gérées par tRPC
- Les messages d'erreur sont en français

### Performance
- Les routes métiers avancées (comme `getTree`, `getOverview`) peuvent être plus lentes
- Utilisez la pagination pour les grandes listes (`list` route)
- Les snapshots temps réel sont optimisés pour des réponses rapides

---

## Exemples d'utilisation

### Récupérer tous les marchés
```bash
curl "http://localhost:3000/trpc/market.getAll"
```

### Créer un nouvel actif
```bash
curl -X POST "http://localhost:3000/trpc/asset.create" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bitcoin", "symbol": "BTC", "marketId": 1}'
```

### Rechercher des marchés
```bash
curl "http://localhost:3000/trpc/market.search?input=%7B%22query%22%3A%22tech%22%7D"
```

Cette documentation couvre toutes les routes disponibles dans l'API Cashou. Pour plus de détails sur les schémas de validation, consultez les fichiers dans `backend/src/schemas-zod/`.

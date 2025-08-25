# API Markets - Documentation

Cette documentation décrit l'API REST pour la gestion des markets dans le système Cashou.

## Table des matières

- [Endpoints disponibles](#endpoints-disponibles)
- [Modèle de données](#modèle-de-données)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Codes de réponse](#codes-de-réponse)
- [Tests](#tests)

## Endpoints disponibles

### Base URL: `/api/markets`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/markets` | Récupère tous les markets avec pagination |
| POST | `/api/markets` | Crée un nouveau market |
| GET | `/api/markets/search` | Recherche des markets |
| GET | `/api/markets/:id` | Récupère un market par ID |
| PUT | `/api/markets/:id` | Met à jour un market |
| DELETE | `/api/markets/:id` | Supprime un market |
| GET | `/api/markets/:id/stats` | Récupère les statistiques d'un market |

## Modèle de données

### Market

```typescript
interface Market {
  id: number;
  name: string | null;
  description: string | null;
  currentTrends: string | null;
  dataSource: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### CreateMarketDto

```typescript
interface CreateMarketDto {
  name?: string;
  description?: string;
  currentTrends?: string;
  dataSource?: string;
}
```

### UpdateMarketDto

```typescript
interface UpdateMarketDto {
  name?: string;
  description?: string;
  currentTrends?: string;
  dataSource?: string;
}
```

## Exemples d'utilisation

### 1. Créer un market

```bash
curl -X POST http://localhost:3000/api/markets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marché Technologique",
    "description": "Marché des technologies innovantes",
    "currentTrends": "IA, Blockchain, IoT",
    "dataSource": "API TechData"
  }'
```

**Réponse :**
```json
{
  "id": 1,
  "name": "Marché Technologique",
  "description": "Marché des technologies innovantes",
  "currentTrends": "IA, Blockchain, IoT",
  "dataSource": "API TechData",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. Récupérer tous les markets

```bash
curl -X GET "http://localhost:3000/api/markets?page=1&limit=5&includeSubmarkets=true"
```

**Paramètres de requête :**
- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre d'éléments par page (défaut: 10)
- `name` : Filtrer par nom (recherche insensible à la casse)
- `includeSubmarkets` : Inclure les sous-marchés (boolean)
- `includeAssets` : Inclure les actifs (boolean)
- `includeFields` : Inclure les champs (boolean)

**Réponse :**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Marché Technologique",
      "description": "Marché des technologies innovantes",
      "currentTrends": "IA, Blockchain, IoT",
      "dataSource": "API TechData",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "submarkets": [
        {
          "id": 1,
          "name": "Intelligence Artificielle",
          "description": "Marché de l'IA"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "pages": 1
  }
}
```

### 3. Récupérer un market par ID

```bash
curl -X GET "http://localhost:3000/api/markets/1?includeRelations=true"
```

**Paramètres de requête :**
- `includeRelations` : Inclure toutes les relations (boolean)

### 4. Mettre à jour un market

```bash
curl -X PUT http://localhost:3000/api/markets/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marché Tech Mis à Jour",
    "currentTrends": "IA Générative, Web3"
  }'
```

### 5. Rechercher des markets

```bash
curl -X GET "http://localhost:3000/api/markets/search?q=tech&limit=3"
```

**Paramètres de requête :**
- `q` : Terme de recherche (requis)
- `limit` : Limite de résultats (défaut: 10)

### 6. Récupérer les statistiques d'un market

```bash
curl -X GET "http://localhost:3000/api/markets/1/stats"
```

**Réponse :**
```json
{
  "submarketCount": 3,
  "assetCount": 15,
  "fieldCount": 8
}
```

### 7. Supprimer un market

```bash
curl -X DELETE http://localhost:3000/api/markets/1
```

**Réponse :**
```json
{
  "message": "Market supprimé avec succès"
}
```

## Codes de réponse

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Créé avec succès |
| 400 | Requête invalide |
| 404 | Ressource non trouvée |
| 405 | Méthode non autorisée |
| 500 | Erreur interne du serveur |

## Gestion des erreurs

Toutes les erreurs retournent un objet JSON avec la structure suivante :

```json
{
  "error": "Description de l'erreur",
  "message": "Message détaillé (optionnel)"
}
```

## Tests

### Prérequis

1. Base de données PostgreSQL configurée
2. Prisma Client généré
3. Serveur démarré

### Lancer les tests

```bash
# Démarrer le serveur
cd backend && bun run dev

# Dans un autre terminal, exécuter les tests
cd backend && bun run src/examples/market-example.ts
```

### Tests unitaires

Les tests pour l'API Markets se trouvent dans le dossier `tests/` et peuvent être exécutés avec :

```bash
bun test
```

## Architecture

L'API Markets suit une architecture en couches :

- **Routes** (`routes/market.routes.ts`) : Gestion du routage HTTP
- **Controllers** (`controllers/market.controller.ts`) : Logique de contrôle et validation
- **Services** (`services/market.service.ts`) : Logique métier et interactions avec Prisma
- **Types** (`types/market.types.ts`) : Définitions TypeScript
- **Database** (`database.ts`) : Configuration Prisma Client

Cette séparation permet une meilleure maintenabilité et testabilité du code.

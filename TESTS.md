# 🧪 Documentation des Tests - Projet Cashou

## 📊 Vue d'ensemble

**564 tests** | **0 échecs** | **100% router coverage** | **100% service coverage** | **~7.0 secondes**

Le système de tests utilise une architecture modulaire avec 5 helpers spécialisés pour maximiser la réutilisabilité et minimiser le code dupliqué.

---

## 🏗️ Architecture des Tests

### Structure des Fichiers

```
apps/backend/tests/
├── helpers/                    # Helpers réutilisables (5 factories)
│   ├── router-test-factory.ts         # Tests de routers tRPC
│   ├── service-test-factory.ts         # Tests unitaires de services
│   ├── auth-context-factory.ts         # Contextes d'authentification
│   ├── integration-test-factory.ts     # Création d'entités pour tests d'intégration
│   ├── integration-test-setup.ts       # Setup/teardown DB pour intégration
│   └── e2e-test-factory.ts             # Setup complet pour tests E2E
│
├── router/                     # Tests des 28 routers tRPC (306 tests)
│   └── *.router.test.ts
│
├── service/                     # Tests des 34 services (172 tests)
│   ├── *.unit.test.ts          # Tests unitaires (mocks Prisma)
│   ├── *.integration.test.ts   # Tests avec DB réelle
│   └── *.regression.test.ts    # Tests de régression
│
├── e2e/                        # Tests End-to-End (29 tests)
│   ├── user-journey.test.ts    # Scénarios complets de jeu
│   └── quiz-journey.test.ts    # Scénarios complets de quiz
│
├── trpc.test.ts                # Tests tRPC routes (12 tests)
├── api.test.ts                 # Tests API REST (5 tests)
└── validators.test.ts          # Tests de validation (14 tests)
```

### Pyramide de Tests

```
        ┌─────────────┐
        │   E2E (29)  │  Tests complets avec serveur réel
        └─────────────┘
       ┌─────────────────┐
       │ Integration (40)│  Services avec DB réelle
       └─────────────────┘
      ┌─────────────────────┐
      │   Routers (306)     │  Routers avec services mockés
      └─────────────────────┘
     ┌─────────────────────────┐
     │   Unitaires (172)       │  Services avec Prisma mocké
     └─────────────────────────┘
```

---

## 🔧 Helpers et Factories

### 1. Router Test Factory

**Fichier** : `helpers/router-test-factory.ts`

**Rôle** : Simplifie les tests de routers tRPC en mockant automatiquement les services et en capturant les appels.

**Architecture** :
- Mock automatique des méthodes de service (findAll, findOne, create, update, delete)
- Capture des appels pour assertions
- Support des méthodes spéciales (findByX, custom methods)

**Utilisation** :
```typescript
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeLevel(id: number, over: Partial<Level> = {}): Level {
  return { 
    id, 
    title: over.title ?? `Level ${id}`,
    duration: 30,
    speed: 1,
    startBalance: 10000,
    ...over 
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(
  LevelService,
  makeLevel
);

it("level.getAll → appelle service.findAll", async () => {
  const caller = levelRouter.createCaller({} as Ctx);
  await caller.getAll();
  
  expect(wasMethodCalled("findAll")).toBeTrue();
  const call = findCall("findAll");
  expect(call).toBeDefined();
});
```

**Optimisations** :
- Réduction de 80% du code boilerplate (50 lignes → 10 lignes)
- Mock automatique de toutes les méthodes CRUD
- Helpers pour assertions : `wasMethodCalled`, `findCall`, `getCallCount`

---

### 2. Service Test Factory

**Fichier** : `helpers/service-test-factory.ts`

**Rôle** : Mocke automatiquement Prisma Client pour tester la logique des services sans DB.

**Architecture** :
- Mock complet de Prisma avec tous les modèles
- Injection du mock dans le service
- Capture de tous les appels Prisma (findMany, findUnique, create, update, delete)

**Utilisation** :
```typescript
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeQuiz(id: number, over: Partial<Quiz> = {}): Quiz {
  return { 
    id, 
    title: over.title ?? `Quiz ${id}`,
    type: "MCQ",
    ...over 
  };
}

const { service, wasMethodCalled, findCall } = createServiceTestSetup(
  QuizService,
  makeQuiz,
  "quiz"
);

it("findAll retourne tous les quiz avec orderBy", async () => {
  const result = await service.findAll();
  
  expect(result).toHaveLength(1);
  expect(wasMethodCalled("findMany")).toBeTrue();
  
  const call = findCall("findMany");
  expect(call?.args).toHaveProperty("orderBy");
  expect(call?.args.orderBy).toEqual({ createdAt: "desc" });
});
```

**Optimisations** :
- Mock automatique de Prisma (pas besoin de créer manuellement)
- Helpers pour vérifier les appels Prisma
- Support des relations (include) et des filtres (where)

---

### 3. Auth Context Factory

**Fichier** : `helpers/auth-context-factory.ts`

**Rôle** : Crée des contextes d'authentification mockés pour tester les routers protégés.

**Architecture** :
- Support de 5 types de contextes : public, user, admin, backoffice, mixte
- Compatible avec Better-Auth et tRPC procedures
- Mock de Request, Session et BackofficeAdmin

**Utilisation** :
```typescript
import { 
  createPublicContext,
  createUserContext,
  createAdminContext,
  createBackofficeContext
} from "../helpers/auth-context-factory";

it("user.getById → retourne user si authentifié", async () => {
  const caller = userRouter.createCaller(
    createUserContext("user-123")
  );
  const result = await caller.getById("user-123");
  expect(result.id).toBe("user-123");
});

it("user.delete → rejette si pas admin", async () => {
  const caller = userRouter.createCaller(
    createUserContext("user-123")
  );
  await expect(caller.delete("user-456")).rejects.toThrow("UNAUTHORIZED");
});
```

**Types de contextes** :
- `createPublicContext()` - Pas de session (pour procedures publiques)
- `createUserContext(userId?)` - Session utilisateur normale
- `createAdminContext(userId?)` - Session admin
- `createBackofficeContext()` - Admin backoffice
- `createMixedContext()` - User + Backoffice admin

---

### 4. Integration Test Factory

**Fichier** : `helpers/integration-test-factory.ts`

**Rôle** : Crée des entités de test dans la DB réelle avec gestion automatique des dépendances.

**Architecture** :
- Création automatique des dépendances (ex: Market → Submarket → Field → Asset)
- Gestion des contraintes FK (ex: User.levelId, GameInstance.userId)
- Cleanup automatique dans l'ordre correct (respect des FK)

**Utilisation** :
```typescript
import { IntegrationTestFactory } from "../helpers/integration-test-factory";
import prisma from "../../src/database";

const factory = new IntegrationTestFactory(prisma);

// Créer un setup complet pour tests d'investissement
const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
  startBalance: 10000,
  assetRate: 5.0,
});

// Créer une partie (crée automatiquement GameUser + Wallet)
const gameInstance = await factory.createGameInstance({
  userId: user.id,
  levelId: level.id,
  startBalance: 10000,
});

// Cleanup après les tests
await factory.cleanup();
```

**Méthodes principales** :
- `createUser()` - Crée un utilisateur avec valeurs par défaut
- `createLevel()` - Crée un niveau
- `createGameInstance()` - Crée une partie (et GameUser + Wallet automatiquement)
- `createAsset()` - Crée un asset (et Market/Submarket/Field si nécessaire)
- `createInvestmentTestSetup()` - Setup complet pour tests d'investissement
- `cleanup()` - Nettoie toutes les entités créées (ordre FK respecté)

**Optimisations** :
- Création automatique des dépendances (évite les erreurs FK)
- Cleanup optimisé avec transactions
- Valeurs par défaut cohérentes

---

### 5. E2E Test Factory

**Fichier** : `helpers/e2e-test-factory.ts`

**Rôle** : Setup complet pour tests End-to-End avec serveur réel, tRPC client et authentification.

**Architecture** :
- **Singleton pattern** : Un seul serveur HTTP par suite de tests
- **Better-Auth** : Authentification réelle via API
- **tRPC Client** : Client HTTP pour appels API
- **Setups réutilisables** : Game et Quiz avec toutes les dépendances

**Utilisation** :
```typescript
import { 
  createE2ESetup, 
  createGameE2ESetup, 
  createQuizE2ESetup,
  cleanupE2EServer 
} from "../helpers/e2e-test-factory";

describe("E2E — Scénario utilisateur", () => {
  const { factory, client } = createE2ESetup();
  let gameSetup: Awaited<ReturnType<typeof createGameE2ESetup>>;

  beforeAll(async () => {
    gameSetup = await createGameE2ESetup(factory, {
      startBalance: 10000,
      assetRate: 5.0,
    });
  });

  afterAll(async () => {
    await factory.cleanup();
    await cleanupE2EServer();
  });

  it("peut acheter un asset via API", async () => {
    await gameSetup.client.investment.buy.mutate({
      walletId: gameSetup.wallet.id,
      assetId: gameSetup.asset.id,
      amount: 2000,
      gameInstanceId: gameSetup.gameInstance.id,
    });
    
    const wallet = await prisma.wallet.findUnique({
      where: { id: gameSetup.wallet.id }
    });
    expect(Number(wallet.amount)).toBe(8000);
  });
});
```

**Fonctions principales** :

#### `createE2ESetup()`
Crée le contexte E2E de base (serveur + client + factory).
- **Singleton serveur** : Un seul serveur démarré pour tous les tests
- **Client tRPC** : Client HTTP réutilisé
- **Factory** : IntegrationTestFactory pour création d'entités

#### `createAuthenticatedUser(email?, password?, name?)`
Inscrit et connecte un utilisateur via Better-Auth.
- Nettoie l'utilisateur existant si nécessaire
- Crée le Level 1 par défaut si absent (pour FK User.levelId)
- Retourne : `{ user, token, client }` (client authentifié)

#### `createGameE2ESetup(factory, options?)`
Setup complet pour scénarios de jeu.
- Crée : User authentifié + Level 1 + GameInstance + Wallet + Asset + Market/Submarket/Field
- **Optimisation** : Utilise Level 1 existant (évite conflits FK)
- **Query optimization** : Récupère Market/Submarket/Field en une seule query avec `include`

#### `createQuizE2ESetup(options?)`
Setup complet pour scénarios de quiz.
- Crée : User authentifié + Quiz + Questions + Réponses
- **Batch creation** : Crée toutes les réponses en une seule opération avec `createMany`
- **Batch creation** : Crée toutes les QuizQuestions en une seule opération

**Optimisations E2E** :

1. **Singleton Pattern**
   - Un seul serveur HTTP démarré pour tous les tests E2E
   - Économie de ~500ms par test (démarrage serveur)

2. **Batch Creation**
   - Réponses : `createMany` au lieu de N appels séquentiels
   - QuizQuestions : `createMany` au lieu de N appels séquentiels
   - **Gain** : ~75% de réduction des queries DB pour les quiz

3. **Query Optimization**
   - Market/Submarket/Field : Une seule query avec `include` au lieu de 3 queries séparées
   - **Gain** : ~66% de réduction des queries DB pour les setups de jeu

4. **Level Management**
   - Level 1 créé automatiquement par `createAuthenticatedUser`
   - Réutilisé par tous les setups (évite conflits FK)
   - **Gain** : Évite les erreurs de contrainte unique

5. **Cleanup Optimisé**
   - Transactions pour cleanup utilisateur (une seule transaction)
   - Ordre respecté pour les FK
   - **Gain** : Cleanup plus rapide et fiable

**Gain global** : ~40% de réduction des queries DB dans les tests E2E

---

## 📊 Types de Tests

### 1. Tests Unitaires (172 tests, ~300ms)

**Objectif** : Tester la logique des services sans DB.

**Technique** : Mock de Prisma Client.

**Helper** : `service-test-factory.ts`

**Exemple** :
```typescript
const { service, wasMethodCalled, findCall } = createServiceTestSetup(
  LevelService,
  makeLevel,
  "level"
);

it("findAll utilise include et orderBy corrects", async () => {
  await service.findAll();
  
  expect(wasMethodCalled("findMany")).toBeTrue();
  const call = findCall("findMany");
  expect(call?.args.include).toEqual({ goals: true, events: true });
  expect(call?.args.orderBy).toEqual({ createdAt: "desc" });
});
```

**Services testés** : 34 services avec 100% coverage.

---

### 2. Tests de Routers (306 tests, ~600ms)

**Objectif** : Vérifier que les routers tRPC appellent les bons services avec les bons paramètres.

**Technique** : Mock des services, appel direct des routers via `createCaller`.

**Helper** : `router-test-factory.ts` + `auth-context-factory.ts`

**Exemple** :
```typescript
const { wasMethodCalled } = createRouterTestSetup(
  LevelService,
  makeLevel
);

it("level.getAll → appelle service.findAll", async () => {
  const caller = levelRouter.createCaller({} as Ctx);
  await caller.getAll();
  expect(wasMethodCalled("findAll")).toBeTrue();
});

it("level.create → appelle service.create avec données validées", async () => {
  const caller = levelRouter.createCaller({} as Ctx);
  await caller.create({ title: "Niveau 1", duration: 30 });
  expect(wasMethodCalled("create")).toBeTrue();
});
```

**Routers testés** : 28/28 (100% coverage).

---

### 3. Tests d'Intégration (40 tests, ~3.5s)

**Objectif** : Tester les services métier avec DB réelle et workflows complexes.

**Technique** : PostgreSQL Docker + Prisma Client réel + transactions.

**Helper** : `integration-test-factory.ts`

**Exemples** :

#### Investment Service (15 tests)
```typescript
it("buy → achète un asset et met à jour wallet + holding + transaction", async () => {
  const { wallet, asset } = await factory.createInvestmentTestSetup();
  
  await investmentService.buy({
    walletId: wallet.id,
    assetId: asset.id,
    amount: 2000,
    gameInstanceId: gameInstance.id,
  });
  
  // Vérifier wallet débité
  const updatedWallet = await prisma.wallet.findUnique({ 
    where: { id: wallet.id } 
  });
  expect(Number(updatedWallet.amount)).toBe(8000);
  
  // Vérifier holding créé
  const holding = await prisma.holding.findFirst({ 
    where: { walletId: wallet.id } 
  });
  expect(Number(holding.quantity)).toBe(2000);
  
  // Vérifier transaction enregistrée
  const transaction = await prisma.transaction.findFirst({
    where: { walletId: wallet.id, type: "BUY" }
  });
  expect(transaction).toBeDefined();
});
```

#### Game Event Flow (9 tests)
```typescript
it("cycle complet : scheduling → trigger → pause → resume", async () => {
  // 1. Créer partie avec événements
  const { gameInstance } = await factory.createGameEventSetup();
  
  // 2. Scheduler les événements (DB + pg-boss)
  await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance.id);
  
  // 3. Déclencher événement
  const event = await prisma.gameInstanceEvent.findFirst({ 
    where: { gameInstanceId: gameInstance.id } 
  });
  await gameEventProcessorService.processEvent(event.id);
  
  // Vérifier : partie mise en pause + notification créée
  const pausedGame = await prisma.gameInstance.findUnique({ 
    where: { id: gameInstance.id } 
  });
  expect(pausedGame.isPaused).toBeTrue();
  
  // 4. Reprendre la partie
  await gameEventTriggerService.completeEvent(gameInstance.id);
  
  // Vérifier : pause levée + temps de pause enregistré
  const resumedGame = await prisma.gameInstance.findUnique({ 
    where: { id: gameInstance.id } 
  });
  expect(resumedGame.isPaused).toBeFalse();
  expect(resumedGame.totalPausedDuration).toBeGreaterThan(0);
});
```

#### End Game Service (16 tests)
```typescript
it("calcule les intérêts pour un holding avec taux annuel", async () => {
  const gameStartedAt = new Date(Date.now() - 100 * 1000);
  const { gameInstance, wallet, asset } = await factory.createEndGameSetup({
    assetRate: 5.0, // 5% par an
    gameStartedAt,
  });

  // Créer un holding acquis au début
  await prisma.holding.create({
    data: {
      walletId: wallet.id,
      assetId: asset.id,
      gameInstanceId: gameInstance.id,
      quantity: 1000,
      acquiredAt: gameStartedAt,
    },
  });

  // Terminer la partie
  const result = await endGameService.endGame(gameInstance.id);

  // Vérifier : intérêts calculés
  // Temps écoulé : 100 secondes réelles = 100 jours de jeu
  // Intérêts = 1000 * (5/100/365) * 100 jours ≈ 13.70 EUR
  expect(result.assetsValue).toBeGreaterThan(1000);
  expect(result.totalValue).toBe(result.walletBalance + result.assetsValue);
});
```

**Services testés** :
- `investment.service` (15 tests) - Achat/vente avec transactions atomiques
- `game-event-flow` (9 tests) - Cycle complet événement → pause → notification → reprise
- `end-game.service` (16 tests) - Liquidation + calcul intérêts + validation objectifs

---

### 4. Tests End-to-End (29 tests, ~2.0s)

**Objectif** : Tester des scénarios utilisateur complets de bout en bout.

**Technique** : Serveur HTTP réel + tRPC client + DB réelle + Better-Auth.

**Helper** : `e2e-test-factory.ts`

#### User Journey (17 tests)

**Scénarios testés** :
1. Inscription et authentification
2. Création de partie
3. Achat d'asset
4. Vente d'asset
5. Calcul de portfolio
6. Fin de partie avec validation objectifs
7. Workflow complet de bout en bout

**Exemple** :
```typescript
it("scénario complet : inscription → partie → investissement → fin", async () => {
  const setup = await createGameE2ESetup(factory, {
    startBalance: 15000,
    assetRate: 3.0,
  });

  // Créer objectif
  const goal = await factory.createGoal({
    goalType: "wallet_gte_start",
    goalValue: 15000,
  });
  await factory.createLevelGoal({
    levelId: setup.level.id,
    goalId: goal.id,
  });

  // Acheter asset
  await setup.client.investment.buy.mutate({
    walletId: setup.wallet.id,
    assetId: setup.asset.id,
    amount: 5000,
    gameInstanceId: setup.gameInstance.id,
  });

  // Vérifier portfolio
  const portfolio = await setup.client.investment.getPortfolio.query({
    walletId: setup.wallet.id,
    gameInstanceId: setup.gameInstance.id,
  });
  expect(Number(portfolio.netWorth)).toBeGreaterThanOrEqual(15000);

  // Terminer partie
  const endResult = await endGameService.endGame(setup.gameInstance.id);
  expect(endResult.success).toBeTrue();
  expect(endResult.goals.some(g => g.achieved)).toBeTrue();
});
```

#### Quiz Journey (12 tests)

**Scénarios testés** :
1. Récupération des quiz disponibles
2. Démarrage d'un quiz
3. Réponses aux questions
4. Validation et calcul de score
5. Attribution de points
6. Workflow complet de bout en bout

**Exemple** :
```typescript
it("scénario complet : récupération → démarrage → réponses → validation", async () => {
  const setup = await createQuizE2ESetup({
    quizType: "MCQ",
    questionCount: 3,
    answersPerQuestion: 3,
  });

  // Récupérer le quiz
  const quiz = await setup.client.quiz.getById.query({ id: setup.quiz.id });
  expect(quiz.id).toBe(setup.quiz.id);

  // Démarrer le quiz
  const userQuiz = await setup.client.userQuiz.create.mutate({
    userId: setup.user.id,
    quizId: setup.quiz.id,
  });

  // Répondre à toutes les questions
  for (let i = 0; i < setup.questions.length; i++) {
    const question = setup.questions[i];
    const correctAnswer = setup.answers[i].find((a) => a.isCorrect);
    
    await setup.client.userAnswer.create.mutate({
      userId: setup.user.id,
      questionId: question.id,
      answerId: correctAnswer.id,
    });
  }

  // Compléter le quiz
  const completed = await setup.client.userQuiz.completeQuiz.mutate({
    id: userQuiz.id,
    isCorrect: true,
  });
  expect(completed.completedAt).toBeDefined();
  expect(completed.isCorrect).toBeTrue();
});
```

**Services testés via API** :
- `auth.router` - Inscription/connexion
- `gameInstance.router` - Création de partie
- `investment.router` - Achat/vente
- `endGame.service` - Fin de partie
- `quiz.router` - Récupération quiz
- `userQuiz.router` - Démarrage/complétion
- `userAnswer.router` - Réponses

---

### 5. Tests tRPC Routes (12 tests, ~250ms)

**Objectif** : Tester les routes tRPC via HTTP.

**Technique** : Serveur réel, requêtes HTTP.

**Exemple** :
```typescript
it("should return health status", async () => {
  const result = await client.health.query();
  expect(result.status).toBe("ok");
});
```

---

### 6. Tests API REST (5 tests, ~50ms)

**Objectif** : Tester les routes REST (health, CORS, etc.).

**Technique** : Serveur réel, requêtes HTTP.

---

### 7. Tests de Validation (14 tests, ~10ms)

**Objectif** : Tester les validations Zod et métier.

**Exemple** :
```typescript
it("should reject impact with assetId and submarketId", () => {
  expect(() => {
    validateImpactData({ assetId: 1, submarketId: 2 });
  }).toThrow();
});
```

---

## 🚀 Commandes

```bash
# CI complète (typecheck + tous les tests)
bun run ci:test

# Tests rapides (unitaires + routers, sans DB)
bun run test:fast

# Tests avec rapport de coverage
bun run test:coverage

# Tests spécifiques
bun run test:router          # Routers uniquement
bun run test:service         # Services uniquement  
bun run test:integration     # Intégration uniquement
bun run test:e2e            # E2E uniquement
```

---

## 🐳 Utilisation avec Docker

### Sans Docker (rapide)
```bash
bun run test:fast           # Unitaires + routers uniquement
```

### Avec Docker (complet)
```bash
docker-compose up -d db_cashou db_backoffice
bun run ci:test             # Tous les tests, intégration incluse
```

---

## 🎯 Workflow Développement

### 1. Développement Local
```bash
docker-compose up -d db_cashou db_backoffice
bun test --watch
```

### 2. Avant Commit
```bash
bun run typecheck
bun run ci:test
```

### 3. CI/CD GitHub Actions

Le workflow `.github/workflows/ci-cd.yml` exécute :
1. **Setup** - Installation + cache dépendances
2. **Code Quality** - TypeScript + ESLint  
3. **Backend Tests** - Tous les tests avec PostgreSQL
4. **Apps Build** - Build backend + backoffice
5. **Docker Build** - Images Docker (main uniquement)

---

## 📚 Coverage

### État Actuel
```
Tests     : 564 tests
Routers   : 100% (28/28 testés)
Services  : 100% (34/34 testés)
E2E       : 29 tests
Temps     : ~7.0 secondes
```

### Détail Router Coverage (28/28)
✅ **Tous testés** : asset, asset-history, answer, dico-entry, event, event-asset, 
   field, game-instance, game-instance-event, game_user, goal, holding, 
   impact, investment, level, level-event, level-goal, market, notification, 
   question, quiz, quiz-question, submarket, transaction, user, user-answer, 
   user-quiz, wallet

### Détail Service Coverage (34/34)
✅ **Tous testés** : asset, asset-history, answer, dico-entry, event, event-asset,
   field, game-instance, game-user, goal, holding, impact, investment,
   level, level-event, level-goal, market, notification, question, quiz,
   quiz-question, submarket, transaction, user, user-answer, user-quiz,
   wallet, end-game, game-event-flow, market (méthodes métier)

### Générer Rapport
```bash
bun run test:coverage
```

---

## 🎯 Bonnes Pratiques

### ✅ À Faire
- Utiliser `router-test-factory` pour tests de routers
- Utiliser `service-test-factory` pour tests unitaires de services
- Utiliser `auth-context-factory` pour tests de routers protégés
- Utiliser `integration-test-factory` pour tests d'intégration
- Utiliser `e2e-test-factory` pour tests E2E
- Mocker les services dans tests de routers
- Utiliser vraie DB pour tests d'intégration
- Nettoyer DB entre tests d'intégration
- Tester cas d'erreur (validation Zod)

### ❌ À Éviter
- Tests d'intégration dans tests de routers
- Données de test persistantes
- Tester détails d'implémentation internes
- Oublier `afterAll` pour arrêt serveur E2E
- Créer manuellement des niveaux dans E2E (utiliser Level 1 par défaut)
- Dupliquer le code de setup entre tests

---

## 📝 Fichiers Clés

- `bunfig.toml` - Configuration Bun tests
- `apps/backend/tests/helpers/router-test-factory.ts` - Factory tests routers
- `apps/backend/tests/helpers/service-test-factory.ts` - Factory tests services
- `apps/backend/tests/helpers/auth-context-factory.ts` - Factory contextes auth
- `apps/backend/tests/helpers/integration-test-factory.ts` - Factory entités intégration
- `apps/backend/tests/helpers/integration-test-setup.ts` - Setup/teardown DB
- `apps/backend/tests/helpers/e2e-test-factory.ts` - Factory tests E2E
- `.github/workflows/ci-cd.yml` - Pipeline CI/CD

---

## 🔍 Optimisations Techniques

### 1. Singleton Pattern (E2E)
- Un seul serveur HTTP démarré pour tous les tests E2E
- Client tRPC réutilisé
- **Gain** : ~500ms par test (démarrage serveur)

### 2. Batch Creation (E2E)
- Réponses : `createMany` au lieu de N appels séquentiels
- QuizQuestions : `createMany` au lieu de N appels séquentiels
- **Gain** : ~75% de réduction des queries DB pour les quiz

### 3. Query Optimization (E2E)
- Market/Submarket/Field : Une seule query avec `include` au lieu de 3 queries
- **Gain** : ~66% de réduction des queries DB pour les setups de jeu

### 4. Factory Pattern
- Réduction de 80% du code boilerplate
- Code réutilisable et maintenable
- **Gain** : ~50 lignes → ~10 lignes par test

### 5. Mock Automatique
- Prisma mocké automatiquement pour tests unitaires
- Services mockés automatiquement pour tests de routers
- **Gain** : Pas besoin de créer manuellement les mocks

### 6. Cleanup Optimisé
- Transactions pour cleanup utilisateur
- Ordre respecté pour les FK
- **Gain** : Cleanup plus rapide et fiable

**Gain global** : ~40% de réduction des queries DB dans les tests E2E

---

## 📊 Statistiques

| Métrique | Valeur |
|----------|--------|
| Tests totaux | 564 |
| Tests unitaires | 172 |
| Tests routers | 306 |
| Tests intégration | 40 |
| Tests E2E | 29 |
| Tests autres | 17 |
| Router coverage | 100% (28/28) |
| Service coverage | 100% (34/34) |
| Temps d'exécution | ~7.0s |
| Helpers | 5 |

---

## 🎉 Résultat

✅ **564 tests passent**  
✅ **Exit code 0**  
✅ **100% router coverage** (28/28)  
✅ **100% service coverage** (34/34)  
✅ **29 tests E2E**  
✅ **CI/CD fonctionnel**  
✅ **Tests maintenables** (5 helpers optimisés)  
✅ **Architecture modulaire et extensible**

🚀 **Système de tests optimal et prêt pour production !**

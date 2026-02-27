/**
 * Factory E2E ultra-optimisée pour tests End-to-End
 * 
 * Réutilise :
 * - IntegrationTestFactory pour les données
 * - Serveur réel (comme trpc.test.ts)
 * - Better-Auth pour l'authentification
 * - tRPC client pour les appels API
 * 
 * Optimisations :
 * - Singleton pattern pour serveur
 * - Cleanup automatique
 * - Setups réutilisables
 * - Cache des entités créées
 */

import { beforeAll, afterAll } from "bun:test";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../src/trpc/router";
import { startServer } from "../../src/index";
import { ensureServerStarted } from "../setup";
import { auth } from "@cashou/auth/server";
import prisma from "../../src/database";
import { IntegrationTestFactory } from "./integration-test-factory";
import type {
  User,
  Level,
  GameInstance,
  Asset,
  Wallet,
  Quiz,
  Question,
  Answer,
  Market,
  Submarket,
  Field,
} from "@cashou/db-app";

type ServerInstance = Awaited<ReturnType<typeof startServer>>;
type MarketWithRelations = Market & { submarkets: Submarket[]; fields: Field[] };

const TEST_PORT = process.env.TEST_PORT || "3001";
const TEST_URL = `http://localhost:${TEST_PORT}`;

export interface E2EContext {
  client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  server: ServerInstance;
  factory: IntegrationTestFactory;
}

export interface AuthenticatedUser {
  user: User;
  token: string;
  client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
}

export interface GameE2ESetup {
  user: User;
  token: string;
  client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  level: Level;
  gameInstance: GameInstance;
  wallet: Wallet;
  asset: Asset;
  market: MarketWithRelations;
  submarket: Submarket | undefined;
  field: Field | undefined;
}

export interface QuizE2ESetup {
  user: User;
  token: string;
  client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  quiz: Quiz;
  questions: Question[];
  answers: Answer[][]; // Array of answers per question
}

/**
 * Crée un contexte E2E complet avec serveur, client tRPC et factory
 * Singleton pattern : un seul serveur par suite de tests
 */
let globalE2EServer: ServerInstance | null = null;
let globalE2EClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null;

export function createE2ESetup(): E2EContext {
  // Créer la factory immédiatement (pas dans beforeAll)
  const factory = new IntegrationTestFactory(prisma);
  
  const context = { factory } as E2EContext;

  beforeAll(async () => {
    // 1. Démarrer le serveur (singleton partagé avec tous les tests)
    if (!globalE2EServer) {
      globalE2EServer = await ensureServerStarted();
    }
    context.server = globalE2EServer;

    // 2. Créer le client tRPC (singleton)
    if (!globalE2EClient) {
      globalE2EClient = createTRPCProxyClient<AppRouter>({
        links: [
          httpBatchLink({
            url: `${TEST_URL}/api/trpc`,
          }),
        ],
      });
    }
    context.client = globalE2EClient;
  });

  afterAll(async () => {
    // Nettoyer la factory (mais garder serveur pour autres tests)
    if (context.factory) {
      await context.factory.cleanup();
    }
  });

  return context;
}

/**
 * Nettoie les références E2E (le serveur est partagé et géré par setup.ts)
 */
export async function cleanupE2EServer() {
  globalE2EServer = null;
  globalE2EClient = null;
}

/**
 * Inscrit et connecte un utilisateur via Better-Auth
 * Retourne le token pour les requêtes authentifiées
 * Optimisé : nettoie l'utilisateur existant avant création
 * S'assure que le level 1 existe (requis par User.levelId default)
 */
export async function createAuthenticatedUser(
  email: string = `e2e-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
  password: string = "TestPassword123!",
  name: string = "E2E Test User"
): Promise<AuthenticatedUser> {
  // S'assurer que le level 1 existe (requis par User.levelId default)
  let defaultLevel = await prisma.level.findUnique({ where: { id: 1 } });
  if (!defaultLevel) {
    defaultLevel = await prisma.level.create({
      data: {
        id: 1,
        title: "Level 1 - Default",
        duration: 365,
        speed: 1,
        startBalance: 10000,
      },
    });
  }

  // Nettoyer l'utilisateur existant s'il existe (optimisé avec transactions)
  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) {
    await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: { wallet: { userId: existingUser.id } },
      }),
      prisma.holding.deleteMany({
        where: { wallet: { userId: existingUser.id } },
      }),
      prisma.wallet.deleteMany({ where: { userId: existingUser.id } }),
      prisma.gameInstance.deleteMany({ where: { userId: existingUser.id } }),
      prisma.session.deleteMany({ where: { userId: existingUser.id } }),
      prisma.account.deleteMany({ where: { userId: existingUser.id } }),
      prisma.user.delete({ where: { id: existingUser.id } }),
    ]);
  }

  // Inscription via Better-Auth
  const signUpResult = await auth.api.signUpEmail({
    body: { email, password, name },
  });

  if (!signUpResult.user || !signUpResult.token) {
    throw new Error("Échec de l'inscription E2E");
  }

  // Récupérer l'utilisateur complet depuis la DB
  const user = await prisma.user.findUnique({
    where: { id: signUpResult.user.id },
  });

  if (!user) {
    throw new Error("Utilisateur non trouvé après inscription");
  }

  // Créer client authentifié
  const client = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${TEST_URL}/api/trpc`,
        headers: () => ({
          Authorization: `Bearer ${signUpResult.token}`,
        }),
      }),
    ],
  });

  return { user, token: signUpResult.token, client };
}

/**
 * Setup complet pour un scénario de jeu E2E
 * Crée : utilisateur authentifié + niveau + partie + wallet + asset
 * Ultra-optimisé : utilise IntegrationTestFactory + transactions
 */
export async function createGameE2ESetup(
  factory: IntegrationTestFactory,
  options?: {
    levelDuration?: number;
    levelSpeed?: number;
    startBalance?: number;
    assetRate?: number | null;
  }
): Promise<GameE2ESetup> {
  // 1. Créer utilisateur authentifié (crée automatiquement level 1 si nécessaire)
  const { user, token, client } = await createAuthenticatedUser();

  // 2. Créer ou récupérer niveau pour le jeu
  // Note: createAuthenticatedUser crée déjà le Level 1 si nécessaire
  // On utilise toujours le Level 1 par défaut pour éviter les conflits
  // Si des paramètres vraiment différents sont nécessaires, ils peuvent être passés via levelId
  const defaultLevel = await prisma.level.findUnique({ where: { id: 1 } });
  if (!defaultLevel) {
    throw new Error("Level 1 devrait exister (créé par createAuthenticatedUser)");
  }
  const level = defaultLevel;

  // 4. Créer partie (crée automatiquement gameUser + wallet)
  const gameInstance = await factory.createGameInstance({
    userId: user.id,
    levelId: level.id,
    startBalance: options?.startBalance ?? 10000,
  });

  // 5. Récupérer wallet créé automatiquement
  const wallet = await prisma.wallet.findFirst({
    where: {
      userId: user.id,
      gameInstanceId: gameInstance.id,
    },
  });

  if (!wallet) {
    throw new Error("Wallet non créé automatiquement");
  }

  // 6. Créer asset (crée automatiquement market/submarket/field)
  const assetRate = options?.assetRate ?? 5.0;
  const asset = await factory.createAsset({
    rate: assetRate === null ? null : assetRate,
  });

  // 7. Récupérer market/submarket/field créés (ULTRA-OPTIMISÉ : une seule query avec include)
  const marketId = asset.marketId !== null ? asset.marketId : undefined;
  if (marketId === undefined) {
    throw new Error("Asset doit avoir un marketId");
  }
  
  // Récupérer market avec submarkets et fields en une seule query
  // Note: Field est lié à Market, pas à Submarket
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: {
      submarkets: true,
      fields: true,
    },
  });
  if (!market) {
    throw new Error("Market introuvable pour l'asset créé");
  }
  
  // Filtrer le submarket et field spécifiques (si présents)
  const submarketId = asset.submarketId !== null ? asset.submarketId : undefined;
  const submarket = submarketId !== undefined 
    ? market.submarkets.find(s => s.id === submarketId)
    : undefined;
  
  const fieldId = asset.fieldId !== null ? asset.fieldId : undefined;
  const field = fieldId !== undefined
    ? market.fields.find(f => f.id === fieldId)
    : undefined;

  return {
    user,
    token,
    client,
    level,
    gameInstance,
    wallet,
    asset,
    market,
    submarket: submarket,
    field: field,
  };
}

/**
 * Setup complet pour un scénario quiz E2E
 * Crée : utilisateur authentifié + quiz + questions + réponses
 * Ultra-optimisé : batch creation
 */
export async function createQuizE2ESetup(
  options?: {
    levelId?: number | null;
    quizType?: "DAILY" | "MCQ";
    questionCount?: number;
    answersPerQuestion?: number;
  }
): Promise<QuizE2ESetup> {
  // 1. Créer utilisateur authentifié
  const { user, token, client } = await createAuthenticatedUser();

  // 2. Créer niveau si nécessaire
  // Note: createAuthenticatedUser crée déjà le Level 1 si nécessaire
  // Pour les quiz MCQ, on utilise le Level 1 par défaut (déjà créé)
  let levelId: number | undefined = options?.levelId ?? undefined;
  if (levelId === undefined && options?.quizType === "MCQ") {
    // Utiliser le Level 1 qui existe toujours (créé par createAuthenticatedUser)
    const defaultLevel = await prisma.level.findUnique({ where: { id: 1 } });
    if (!defaultLevel) {
      throw new Error("Level 1 devrait exister (créé par createAuthenticatedUser)");
    }
    levelId = defaultLevel.id;
  }

  // 3. Créer quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: `E2E Quiz ${Date.now()}`,
      description: "Quiz de test E2E",
      type: options?.quizType ?? "MCQ",
      levelId: levelId ?? undefined,
    },
  });

  // 4. Créer questions + réponses (ULTRA-OPTIMISÉ : batch creation)
  const questionCount = options?.questionCount ?? 3;
  const answersPerQuestion = options?.answersPerQuestion ?? 4;
  
  // Créer toutes les questions en une seule opération
  const questionsData = Array.from({ length: questionCount }, (_, i) => ({
    text: `Question E2E ${i + 1} ?`,
    explanation: `Explication pour question ${i + 1}`,
  }));
  
  // Note: Prisma ne supporte pas createMany avec retour des IDs créés
  // On doit créer séquentiellement pour obtenir les IDs, mais on optimise les réponses
  const questions: Question[] = [];
  for (let i = 0; i < questionCount; i++) {
    const question = await prisma.question.create({
      data: questionsData[i],
    });
    questions.push(question);
  }

  // Créer toutes les réponses en batch (groupées par question)
  const allAnswersData: Array<{ questionId: number; text: string; isCorrect: boolean }> = [];
  for (let i = 0; i < questionCount; i++) {
    for (let j = 0; j < answersPerQuestion; j++) {
      allAnswersData.push({
        questionId: questions[i].id,
        text: `Réponse ${j + 1} pour question ${i + 1}`,
        isCorrect: j === 0, // Première réponse = correcte
      });
    }
  }
  
  // Créer toutes les réponses en une seule opération
  await prisma.answer.createMany({
    data: allAnswersData,
  });

  // Récupérer toutes les réponses créées (groupées par question)
  const answers: Answer[][] = [];
  for (const question of questions) {
    const questionAnswers = await prisma.answer.findMany({
      where: { questionId: question.id },
      orderBy: { id: "asc" },
    });
    answers.push(questionAnswers);
  }

  // Créer toutes les associations quiz-question en batch
  const quizQuestionsData = questions.map((q, i) => ({
    quizId: quiz.id,
    questionId: q.id,
    position: i + 1,
  }));
  await prisma.quizQuestion.createMany({
    data: quizQuestionsData,
  });

  return {
    user,
    token,
    client,
    quiz,
    questions,
    answers,
  };
}

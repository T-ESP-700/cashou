/**
 * Helper pour créer des tests de services optimisés
 * Abstrait le setup/teardown et le mocking de Prisma pour les services CRUD
 */

import { beforeEach, mock } from "bun:test";
import type { PrismaClient } from "@cashou/db-app";

// Type pour les méthodes standard d'un service CRUD (utilisé pour la documentation)
export type ServiceMethods<T extends { id: number }> = {
  findAll: () => Promise<T[]>;
  findOne: (id: number) => Promise<T | null>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: number, data: Partial<T>) => Promise<T>;
  delete: (id: number) => Promise<T>;
};

export type Call<T> =
  | { method: "findMany"; args?: any }
  | { method: "findUnique"; args: { where: { id: number } } }
  | { method: "create"; args: { data: Partial<T> } }
  | { method: "update"; args: { where: { id: number }; data: Partial<T> } }
  | { method: "delete"; args: { where: { id: number } } };

export interface ServiceTestSetupConfig {
  createId?: number;
  notFoundId?: number;
}

/**
 * Crée un setup de test pour un service avec mocking automatique de Prisma
 * 
 * @param ServiceClass - La classe du service à tester
 * @param makeEntity - Fonction pour créer une entité mock
 * @param modelName - Nom du modèle Prisma (ex: "level", "quiz", "user")
 * @param config - Configuration optionnelle
 * @returns Un objet avec le service, les mocks et les helpers de test
 * 
 * @example
 * ```typescript
 * const { service, wasMethodCalled, findCall } = createServiceTestSetup(
 *   QuizService,
 *   makeQuiz,
 *   "quiz"
 * );
 * 
 * it("findAll retourne tous les quiz", async () => {
 *   const result = await service.findAll();
 *   expect(result).toHaveLength(1);
 *   expect(wasMethodCalled("findMany")).toBeTrue();
 * });
 * ```
 */
export function createServiceTestSetup<T extends { id: number }>(
  ServiceClass: new (prisma: any) => any,
  makeEntity: (id: number, overrides?: Partial<T>) => T,
  modelName: string,
  config?: ServiceTestSetupConfig
) {
  const calls: Call<T>[] = [];
  const createId = config?.createId ?? 123;
  const notFoundId = config?.notFoundId ?? 999;

  // Créer le mock Prisma avec tous les modèles nécessaires
  const mockPrisma = {
    [modelName]: {
      findMany: mock(async (args?: any): Promise<T[]> => {
        calls.push({ method: "findMany", args });
        return [makeEntity(1)];
      }),
      findUnique: mock(async (args: { where: { id: number } }): Promise<T | null> => {
        calls.push({ method: "findUnique", args });
        if (args.where.id === notFoundId) return null;
        return makeEntity(args.where.id);
      }),
      findFirst: mock(async (args?: any): Promise<T | null> => {
        calls.push({ method: "findMany", args }); // findFirst uses findMany internally
        return makeEntity(1);
      }),
      create: mock(async (args: { data: Partial<T> }): Promise<T> => {
        calls.push({ method: "create", args });
        return makeEntity(createId, args.data);
      }),
      update: mock(async (args: { where: { id: number }; data: Partial<T> }): Promise<T> => {
        calls.push({ method: "update", args });
        return makeEntity(args.where.id, args.data);
      }),
      updateMany: mock(async (args: any): Promise<{ count: number }> => {
        calls.push({ method: "update", args });
        return { count: 1 };
      }),
      delete: mock(async (args: { where: { id: number } }): Promise<T> => {
        calls.push({ method: "delete", args });
        return makeEntity(args.where.id);
      }),
      deleteMany: mock(async (args: any): Promise<{ count: number }> => {
        calls.push({ method: "delete", args });
        return { count: 1 };
      }),
      count: mock(async (args?: any): Promise<number> => {
        calls.push({ method: "findMany", args });
        return 1;
      }),
    },
    $disconnect: mock(async () => {}),
    $transaction: mock(async (callback: any) => {
      // Execute the callback with the mock prisma
      return callback(mockPrisma);
    }),
    $executeRaw: mock(async () => 1),
    $executeRawUnsafe: mock(async () => 1),
    $queryRaw: mock(async () => []),
    $queryRawUnsafe: mock(async () => []),
  } as unknown as PrismaClient;

  // Créer le service avec le mock Prisma
  const service = new ServiceClass(mockPrisma);

  // Reset les calls avant chaque test
  beforeEach(() => {
    calls.length = 0;
  });

  /**
   * Vérifie si une méthode Prisma a été appelée
   */
  const wasMethodCalled = (method: Call<T>["method"]) => {
    return calls.some((c) => c.method === method);
  };

  /**
   * Trouve le premier appel d'une méthode Prisma
   */
  const findCall = (method: Call<T>["method"]) => {
    return calls.find((c) => c.method === method);
  };

  /**
   * Compte le nombre d'appels d'une méthode Prisma
   */
  const getCallCount = (method: Call<T>["method"]) => {
    return calls.filter((c) => c.method === method).length;
  };

  /**
   * Récupère tous les appels d'une méthode Prisma
   */
  const getAllCalls = (method: Call<T>["method"]) => {
    return calls.filter((c) => c.method === method);
  };

  return {
    service,
    mockPrisma,
    calls,
    wasMethodCalled,
    findCall,
    getCallCount,
    getAllCalls,
  };
}

/**
 * Helper pour créer une entité mock avec des valeurs par défaut
 * Utile pour les tests de services
 * 
 * @example
 * ```typescript
 * function makeQuiz(id: number, over: Partial<Quiz> = {}): Quiz {
 *   return createMockEntity(id, {
 *     title: "Quiz",
 *     levelId: 1,
 *     type: "MCQ",
 *     ...over
 *   });
 * }
 * ```
 */
export function createMockEntity<T extends { id: number; createdAt?: Date; updatedAt?: Date }>(
  id: number,
  defaults: Omit<T, "id" | "createdAt" | "updatedAt">,
  overrides?: Partial<T>
): T {
  const now = new Date();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    ...defaults,
    ...overrides,
  } as T;
}

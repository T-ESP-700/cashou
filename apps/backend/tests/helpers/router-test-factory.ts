/**
 * Factory pour créer des tests de routeurs standardisés
 * 
 * Ce helper élimine la duplication de code dans les tests de routeurs
 * en fournissant un setup/teardown automatique pour les mocks de services.
 * 
 * @example
 * ```typescript
 * import { createRouterTestSetup } from "../helpers/router-test-factory";
 * import { LevelService } from "../../src/trpc/services/level.service";
 * 
 * const { calls } = createRouterTestSetup(LevelService, makeLevel);
 * 
 * // Les beforeEach/afterEach sont automatiquement configurés
 * // Vos tests peuvent directement utiliser `calls` pour vérifier les appels
 * ```
 */

import { beforeEach, afterEach } from "bun:test";

/**
 * Interface représentant les méthodes standards d'un service CRUD
 */
type ServiceMethods<T extends { id: number }> = {
  findAll: () => Promise<T[]>;
  findOne: (id: number) => Promise<T | null>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: number, data: Partial<T>) => Promise<T>;
  delete: (id: number) => Promise<Pick<T, "id">>;
};

/**
 * Type représentant un appel de méthode capturé
 */
export type Call<T> =
  | { method: "findAll"; args?: undefined }
  | { method: "findOne"; args: { id: number } }
  | { method: "create"; args: { data: Partial<T> } }
  | { method: "update"; args: { id: number; data: Partial<T> } }
  | { method: "delete"; args: { id: number } };

/**
 * Configuration pour le setup des tests de routeur
 */
export interface RouterTestSetupConfig<T extends { id: number }> {
  /** Classe du service à mocker */
  ServiceClass: new (...args: any[]) => any;
  /** Fonction factory pour créer une entité */
  makeEntity: (id: number, overrides?: Partial<T>) => T;
  /** ID à retourner pour les créations (défaut: 123) */
  createId?: number;
  /** ID qui doit retourner null pour findOne (défaut: 404) */
  notFoundId?: number;
}

/**
 * Crée un setup de test standardisé pour un routeur
 * 
 * Cette fonction configure automatiquement les mocks de service et fournit
 * un tableau pour capturer les appels de méthodes.
 * 
 * @param config Configuration du setup de test
 * @returns Objet contenant le tableau des appels et des helpers
 */
export function createRouterTestSetup<T extends { id: number }>(
  ServiceClass: new (...args: any[]) => any,
  makeEntity: (id: number, overrides?: Partial<T>) => T,
  config?: Partial<Omit<RouterTestSetupConfig<T>, "ServiceClass" | "makeEntity">>
) {
  const calls: Call<T>[] = [];
  const createId = config?.createId ?? 123;
  const notFoundId = config?.notFoundId ?? 404;

  // Sauvegarder les méthodes originales
  const original: ServiceMethods<T> = {
    findAll: ServiceClass.prototype.findAll,
    findOne: ServiceClass.prototype.findOne,
    create: ServiceClass.prototype.create,
    update: ServiceClass.prototype.update,
    delete: ServiceClass.prototype.delete,
  };

  beforeEach(() => {
    // Réinitialiser le tableau des appels
    calls.length = 0;

    // Mock findAll
    ServiceClass.prototype.findAll = async function (this: unknown): Promise<T[]> {
      calls.push({ method: "findAll" });
      return [makeEntity(1)];
    };

    // Mock findOne
    ServiceClass.prototype.findOne = async function (this: unknown, id: number): Promise<T | null> {
      calls.push({ method: "findOne", args: { id } });
      if (id === notFoundId) return null;
      return makeEntity(id);
    };

    // Mock create
    ServiceClass.prototype.create = async function (this: unknown, data: Partial<T>): Promise<T> {
      calls.push({ method: "create", args: { data } });
      return makeEntity(createId, data);
    };

    // Mock update
    ServiceClass.prototype.update = async function (this: unknown, id: number, data: Partial<T>): Promise<T> {
      calls.push({ method: "update", args: { id, data } });
      return makeEntity(id, data);
    };

    // Mock delete
    ServiceClass.prototype.delete = async function (this: unknown, id: number): Promise<Pick<T, "id">> {
      calls.push({ method: "delete", args: { id } });
      return { id } as Pick<T, "id">;
    } as typeof ServiceClass.prototype.delete;
  });

  afterEach(() => {
    // Restaurer les méthodes originales
    ServiceClass.prototype.findAll = original.findAll;
    ServiceClass.prototype.findOne = original.findOne;
    ServiceClass.prototype.create = original.create;
    ServiceClass.prototype.update = original.update;
    ServiceClass.prototype.delete = original.delete;
  });

  return {
    /** Tableau des appels capturés */
    calls,
    /** Helper pour trouver un appel spécifique */
    findCall: (method: Call<T>["method"]) => calls.find((c) => c.method === method),
    /** Helper pour vérifier si une méthode a été appelée */
    wasMethodCalled: (method: Call<T>["method"]) => calls.some((c) => c.method === method),
    /** Helper pour obtenir le nombre d'appels d'une méthode */
    getCallCount: (method: Call<T>["method"]) => calls.filter((c) => c.method === method).length,
  };
}

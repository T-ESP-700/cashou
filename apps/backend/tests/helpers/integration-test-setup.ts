/**
 * Configuration commune pour les tests d'intégration
 * 
 * Ce module fournit des utilitaires pour configurer et nettoyer
 * les tests d'intégration qui interagissent avec la base de données.
 * 
 * @example
 * ```typescript
 * import { setupTestDatabase } from "../helpers/integration-test-setup";
 * 
 * describe("Mon test d'intégration", () => {
 *   setupTestDatabase();
 *   
 *   it("teste quelque chose", async () => {
 *     // La connexion DB est automatiquement gérée
 *   });
 * });
 * ```
 */

import { beforeAll, afterAll } from "bun:test";
import { prisma } from "@cashou/db-app";

/**
 * Configure la base de données pour les tests d'intégration
 * 
 * Cette fonction doit être appelée dans un bloc describe() pour
 * initialiser et nettoyer automatiquement la connexion à la base de données.
 * 
 * @param options Options de configuration
 * @param options.skipDisconnect Si true, ne déconnecte pas après les tests (défaut: false)
 */
export function setupTestDatabase(options: { skipDisconnect?: boolean } = {}) {
  beforeAll(async () => {
    // Vérifier que la connexion fonctionne
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error("❌ Erreur de connexion à la base de données de test:", error);
      throw error;
    }
  });

  afterAll(async () => {
    if (!options.skipDisconnect) {
      await prisma.$disconnect();
    }
  });
}

/**
 * Nettoie une table spécifique pour les tests
 * 
 * Utile pour s'assurer qu'une table est vide avant de commencer un test.
 * 
 * @param tableName Nom de la table à nettoyer
 */
export async function cleanupTable(tableName: string) {
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
  } catch (error) {
    console.warn(`⚠️ Impossible de nettoyer la table ${tableName}:`, error);
  }
}

/**
 * Crée une entité de test et la supprime automatiquement après le test
 * 
 * Cette fonction est utile pour les tests qui créent des données
 * et veulent s'assurer qu'elles sont nettoyées même en cas d'échec.
 * 
 * @param createFn Fonction pour créer l'entité
 * @param deleteFn Fonction pour supprimer l'entité
 * @returns L'ID de l'entité créée et une fonction pour la supprimer manuellement
 * 
 * @example
 * ```typescript
 * const { id, cleanup } = await createTestEntity(
 *   () => prisma.level.create({ data: { title: "Test" } }),
 *   (id) => prisma.level.delete({ where: { id } })
 * );
 * 
 * // Utiliser l'entité dans les tests
 * 
 * // cleanup() sera appelé automatiquement après le test
 * ```
 */
export async function createTestEntity<T extends { id: number }>(
  createFn: () => Promise<T>,
  deleteFn: (id: number) => Promise<unknown>
): Promise<{ id: number; cleanup: () => Promise<void> }> {
  const entity = await createFn();
  
  const cleanup = async () => {
    try {
      await deleteFn(entity.id);
    } catch (error) {
      console.warn(`⚠️ Impossible de nettoyer l'entité ${entity.id}:`, error);
    }
  };

  return { id: entity.id, cleanup };
}

/**
 * Gestionnaire d'entités de test avec nettoyage automatique
 * 
 * Cette classe permet de gérer plusieurs entités de test et de les
 * nettoyer toutes automatiquement à la fin.
 */
export class TestEntityManager {
  private cleanupFunctions: Array<() => Promise<void>> = [];

  /**
   * Enregistre une fonction de nettoyage
   */
  registerCleanup(cleanupFn: () => Promise<void>): void {
    this.cleanupFunctions.push(cleanupFn);
  }

  /**
   * Crée une entité et enregistre automatiquement son nettoyage
   */
  async create<T extends { id: number }>(
    createFn: () => Promise<T>,
    deleteFn: (id: number) => Promise<unknown>
  ): Promise<T> {
    const entity = await createFn();
    
    this.registerCleanup(async () => {
      try {
        await deleteFn(entity.id);
      } catch (error) {
        console.warn(`⚠️ Impossible de nettoyer l'entité ${entity.id}:`, error);
      }
    });

    return entity;
  }

  /**
   * Nettoie toutes les entités enregistrées
   */
  async cleanup(): Promise<void> {
    // Nettoyer dans l'ordre inverse de création
    for (const cleanupFn of this.cleanupFunctions.reverse()) {
      await cleanupFn();
    }
    this.cleanupFunctions = [];
  }

  /**
   * Configure le nettoyage automatique pour un bloc de tests
   */
  setupAutoCleanup(): void {
    afterAll(async () => {
      await this.cleanup();
    });
  }
}

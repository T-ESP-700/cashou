// Configuration globale pour les tests - Compatible avec Bun
import { beforeAll, afterAll } from 'bun:test';
import type { PrismaClient } from '@prisma/client';

// Variable globale pour Prisma dans les tests
declare global {
  var __PRISMA_TEST__: PrismaClient | undefined;
}

beforeAll(async () => {
  // Configuration spécifique à votre stack Bun + PostgreSQL + Prisma
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/cashou_test';
  process.env.NODE_ENV = 'test';

  // Optionnel : initialiser Prisma pour les tests d'intégration
  // const { PrismaClient } = await import('@prisma/client');
  // global.__PRISMA_TEST__ = new PrismaClient();
});

afterAll(async () => {
  // Nettoyage des connexions - Important avec Bun
  if (global.__PRISMA_TEST__) {
    await global.__PRISMA_TEST__.$disconnect();
    global.__PRISMA_TEST__ = undefined;
  }
});
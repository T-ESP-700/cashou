import { PrismaClient } from './generated/client';

const globalForPrisma = globalThis as unknown as { backofficePrisma?: PrismaClient };

export const prisma =
  globalForPrisma.backofficePrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.backofficePrisma = prisma;
}

// Export PrismaClient type
export { PrismaClient } from './generated/client';

// Export all types from generated client
export * from './generated/client';

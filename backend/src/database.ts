//backend/src/database.ts
import { PrismaClient } from '@prisma/client'

// Récupérer l'URL depuis la variable d'environnement
const databaseUrl = process.env.CASHOU_DB_URL;

// Si nous sommes dans un conteneur Docker, remplacer localhost par db_cashou
const url = process.env.DOCKER_CONTAINER
    ? databaseUrl?.replace('localhost', 'db_cashou')
    : databaseUrl;

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url
      }
    }
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
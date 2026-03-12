//backend/src/database.ts
// Configuration et initialisation du client Prisma pour la base de données
import { PrismaClient } from '@cashou/db-app'

// Récupération de l'URL de la base de données depuis les variables d'environnement
const databaseUrl = process.env.CASHOU_DB_URL;

// Gestion de l'environnement Docker vs développement local
// En Docker, on remplace 'localhost' par 'db_cashou' (nom du service Docker)
// Cela permet de connecter les conteneurs entre eux via le réseau Docker
const url = process.env.DOCKER_CONTAINER
  ? databaseUrl?.replace('localhost', 'db_cashou')
  : databaseUrl;

// Factory pour créer une instance Prisma avec la configuration personnalisée
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url // URL de connexion calculée selon l'environnement
      }
    }
  });
}

// Extension du type global pour stocker l'instance Prisma
// Nécessaire pour éviter la création de multiples connexions en développement
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Pattern Singleton : une seule instance Prisma dans toute l'application
// Réutilise l'instance existante ou en crée une nouvelle si nécessaire
// SKIP_PRISMA_INIT permet aux tests unitaires de ne pas initialiser Prisma
export const prisma = process.env.SKIP_PRISMA_INIT
  ? (null as unknown as PrismaClient)
  : (globalForPrisma.prisma ?? prismaClientSingleton())

// En développement, stocke l'instance globalement pour éviter les reconnexions
// lors du hot-reload (rechargement automatique du code)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Export par défaut pour faciliter l'importation
export default prisma

// Client Prisma singleton pour la base BACKOFFICE.
// Même motif que database.ts (app) : une seule instance partagée pour éviter de
// multiplier les pools de connexions (plusieurs `new PrismaClient()` épuisaient
// les connexions Postgres — cf. audit S7).
import { PrismaClient } from '@cashou/db-backoffice';

const databaseUrl = process.env.BACKOFFICE_DB_URL;

// En Docker, 'localhost' devient le nom du service Postgres backoffice.
const url = process.env.DOCKER_CONTAINER
  ? databaseUrl?.replace('localhost', 'db_backoffice')
  : databaseUrl;

const makeClient = () =>
  new PrismaClient({
    datasources: {
      db: { url },
    },
  });

const globalForBackoffice = globalThis as unknown as {
  backofficePrisma: PrismaClient | undefined;
};

// SKIP_PRISMA_INIT permet aux tests unitaires de ne pas initialiser Prisma.
export const backofficePrisma = process.env.SKIP_PRISMA_INIT
  ? (null as unknown as PrismaClient)
  : (globalForBackoffice.backofficePrisma ?? makeClient());

// En dev, on conserve l'instance globalement pour survivre au hot-reload.
if (process.env.NODE_ENV !== 'production') {
  globalForBackoffice.backofficePrisma = backofficePrisma;
}

export default backofficePrisma;

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@cashou/db-app';
import bcrypt from 'bcryptjs';

// Coût bcrypt (≥12 recommandé 2025+). N'invalide pas les hash existants :
// bcrypt.compare lit le coût encodé dans chaque hash.
const BCRYPT_ROUNDS = 12;

// Origines de confiance pilotées par env (CSV). En prod, une requête navigateur
// portant une Origin doit y figurer. Le mobile natif n'envoie pas d'Origin →
// better-auth le traite en mode permissif (non bloqué), donc pas besoin du plugin Expo.
function resolveTrustedOrigins(): string[] {
  const fromEnv = (process.env.TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV !== 'production') return ['*'];
  return [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'];
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => bcrypt.hash(password, BCRYPT_ROUNDS),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  // Temporarily disable social providers
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  //   },
  // },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  account: {
    accountLinking: {
      enabled: false, // Disable account linking for now
    },
  },
  trustedOrigins: resolveTrustedOrigins(),
  advanced: {
    disableCSRFCheck: process.env.NODE_ENV === 'development', // Disable CSRF in development for mobile
  },
  user: {
    additionalFields: {
      username: {
        type: 'string',
        required: false,
      },
      discriminator: {
        type: 'string',
        required: false,
      },
    },
  },
});

// Password hashing utilities
export const hash = {
  password: async (password: string) => {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },
  verify: async (password: string, hash: string) => {
    return bcrypt.compare(password, hash);
  },
};

export type Auth = typeof auth;

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@cashou/db-app';
import bcrypt from 'bcryptjs';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
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
  // Trusted origins for development and production
  // In development, accept common localhost origins and the one we inject for tools like Bruno
  trustedOrigins: process.env.NODE_ENV === 'production'
    ? (process.env.TRUSTED_ORIGINS?.split(',') || [])
    : [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3001',
      ],
});

// Password hashing utilities
export const hash = {
  password: async (password: string) => {
    return bcrypt.hash(password, 10);
  },
  verify: async (password: string, hash: string) => {
    return bcrypt.compare(password, hash);
  },
};

export type Auth = typeof auth;
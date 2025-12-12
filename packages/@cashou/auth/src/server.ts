import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@cashou/db-app';
import bcrypt from 'bcryptjs';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  basePath: '/api/auth',
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
  trustedOrigins: ['*'], // Allow all origins in development (mobile app)
  advanced: {
    disableCSRFCheck: process.env.NODE_ENV === 'development', // Disable CSRF in development for mobile
  },
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

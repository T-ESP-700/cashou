import { createAuthClient } from 'better-auth/client';
import type { Session, User } from 'better-auth/types';
import { AUTH_URL } from './api-config';

export const authClient = createAuthClient({
  baseURL: AUTH_URL,
  // Flux 100% Bearer : jamais de cookies (sinon iOS renvoie le cookie better-auth
  // périmé et le CSRF check répond 403 — cf. login-form/trpc/game-socket).
  fetchOptions: {
    credentials: 'omit',
  },
});

export type { Session, User };

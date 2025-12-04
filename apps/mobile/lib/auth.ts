import { createAuthClient } from 'better-auth/client';
import type { Session, User } from 'better-auth/types';
import { AUTH_URL } from './api-config';

export const authClient = createAuthClient({
  baseURL: AUTH_URL,
});

export type { Session, User };

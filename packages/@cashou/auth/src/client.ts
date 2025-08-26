import { createAuthClient } from 'better-auth/client';
import type { Auth } from './server';

export const createAuth = (baseURL: string) => {
  return createAuthClient<Auth>({
    baseURL,
  });
};

export type { Session, User } from 'better-auth/types';
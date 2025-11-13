import { createAuthClient } from 'better-auth/client';
import type { Session, User } from 'better-auth/types';
import Constants from 'expo-constants';

// Get API URL from environment variables
const AUTH_URL = Constants.expoConfig?.extra?.authUrl || process.env.EXPO_PUBLIC_AUTH_URL || 'http://localhost:3000/api/auth';

export const authClient = createAuthClient({
  baseURL: AUTH_URL,
});

export type { Session, User };

import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
// Import AppRouter type directly from backend (monorepo workspace)
import type { AppRouter } from '../../backend/src/trpc/router';
import { tokenStorage } from './token-storage';
import { API_URL } from './api-config';

// Global error handler for authentication errors
let authErrorHandler: (() => void) | null = null;
let isHandlingAuthError = false;

export function setAuthErrorHandler(handler: () => void) {
  authErrorHandler = handler;
}

export function resetAuthErrorHandling() {
  isHandlingAuthError = false;
}

// Create the httpBatchLink with auth and error handling
// Shared between React and vanilla clients
const createBatchLink = () =>
  httpBatchLink({
    url: API_URL,
    async headers() {
      const token = await tokenStorage.getToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
    fetch(url, options) {
      return fetch(url, options).then(async (response) => {
        // Check for 401 Unauthorized
        if (response.status === 401 && !isHandlingAuthError) {
          console.log('[tRPC] 401 Unauthorized detected, clearing token...');
          isHandlingAuthError = true;
          await tokenStorage.removeToken();

          // Trigger auth error handler to redirect to login
          if (authErrorHandler) {
            authErrorHandler();
          }
        }

        return response;
      }).catch((error) => {
        // Handle network errors
        console.error('[tRPC] Network error:', error);
        throw error;
      });
    },
  });

// React Query integrated tRPC client (for hooks in components)
// @ts-expect-error - tRPC v11 type constraint issue between server/client packages
export const trpc = createTRPCReact<AppRouter>();

// Create the tRPC client for use with React Query provider
export const createTRPCClientForProvider = () =>
  trpc.createClient({
    links: [createBatchLink()],
  });

// Vanilla tRPC client (for non-React contexts: notification handlers, etc.)
// Keep this for backward compatibility during migration
// @ts-expect-error - tRPC v11 type constraint issue between server/client packages
export const trpcClient = createTRPCClient<AppRouter>({
  links: [createBatchLink()],
});

import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@cashou/api/types';
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

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
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
    }),
  ],
});

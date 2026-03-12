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
          // Handle expired/invalid token — silently clear and redirect to login
          if (response.status === 401 && !isHandlingAuthError) {
            isHandlingAuthError = true;
            await tokenStorage.removeToken();

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

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../../apps/backend/src/trpc/router';
import { QueryClient } from '@tanstack/react-query';
import { LocalAuthService } from './local-auth';

export const trpc = createTRPCReact<AppRouter>();

// Create query client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

// Get the backend URL from environment or use default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Create tRPC client with authentication
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/api/trpc`,
      async headers() {
        if (typeof window === 'undefined') {
          return {};
        }

        const token = LocalAuthService.getToken();
        return token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {};
      },
    }),
  ],
});

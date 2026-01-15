import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink, type TRPCLink } from '@trpc/client';
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

// Shared link configuration
const createLinks = (): TRPCLink<AppRouter>[] => [
  httpBatchLink({
    url: `${BACKEND_URL}/api/trpc`,
    async headers() {
      if (typeof window === 'undefined') {
        return {};
      }

      const token = LocalAuthService.getToken();
      return token
        ? {
            Backoffice: token,
          }
        : {};
    },
  }) as TRPCLink<AppRouter>,
];

// Create tRPC client for React Query
export const trpcClient = trpc.createClient({
  links: createLinks(),
});

// Vanilla tRPC client for non-React usage (e.g., auth service)
export const vanillaTrpcClient = createTRPCClient<AppRouter>({
  links: createLinks(),
});

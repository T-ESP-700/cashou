import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@cashou/api';
import { QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

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
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          return {
            Authorization: `Bearer ${session.access_token}`,
          };
        }

        return {};
      },
    }),
  ],
});

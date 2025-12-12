import { createTRPCClient, httpBatchLink } from '@trpc/client';

// Import AppRouter type directly from backend
import type { AppRouter } from '../../../apps/backend/src/trpc/router';

export type { AppRouter };

export const createApiClient = (url: string, getHeaders?: () => Promise<HeadersInit>) => {
  // Type the client with AppRouter for full type inference
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        headers: getHeaders,
      }),
    ],
  });
};

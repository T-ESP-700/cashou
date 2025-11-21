import { createTRPCClient, httpBatchLink } from '@trpc/client';

// Import AppRouter type directly from backend
export type { AppRouter } from '../../../apps/backend/src/trpc/router';

export const createApiClient = (url: string, getHeaders?: () => Promise<HeadersInit>) => {
  // We use any here because the AppRouter type will be inferred at build time
  // The actual typing will be enforced by the backend's router definition
  return createTRPCClient<any>({
    links: [
      httpBatchLink({
        url,
        headers: getHeaders,
      }),
    ],
  });
};

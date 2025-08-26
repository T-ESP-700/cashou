import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './types';

export const createApiClient = (url: string, getHeaders?: () => Promise<HeadersInit>) => {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        headers: getHeaders,
      }),
    ],
  });
};
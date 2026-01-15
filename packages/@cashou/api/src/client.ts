import { createTRPCClient, httpBatchLink, type TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';

type HTTPHeaders = Record<string, string | string[] | undefined>;

/**
 * Creates a tRPC client for the Cashou API.
 * The generic parameter T should be the AppRouter type from the backend.
 *
 * @example
 * // In the consuming app:
 * import type { AppRouter } from '../../backend/src/trpc/router';
 * const client = createApiClient<AppRouter>(url, getHeaders);
 */
export function createApiClient<T extends AnyRouter>(
  url: string,
  getHeaders?: () => Promise<HTTPHeaders>
) {
  const link = httpBatchLink({
    url,
    headers: getHeaders,
  });

  return createTRPCClient<T>({
    links: [link as TRPCLink<T>],
  });
}

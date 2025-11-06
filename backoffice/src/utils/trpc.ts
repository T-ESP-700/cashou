import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

// Import AppRouter type from backend
// Note: This assumes the backend types are accessible
// If not, you may need to create a shared types package or export types separately
import type { AppRouter } from '../../../backend/src/routers/app.router';

// Create the tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Get the API URL from environment or use default
const getBaseUrl = () => {
  // In browser, use relative URL (will be proxied by Vite)
  if (typeof window !== 'undefined') {
    return '';
  }
  // In SSR, use full URL
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

// Create tRPC client configuration
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      // You can add headers here if needed (e.g., auth tokens)
      headers: () => {
        return {
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
});

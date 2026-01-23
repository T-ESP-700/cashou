// Re-export AppRouter type from backend
// Import the actual type from the backend router
export type { AppRouter } from '../../../apps/backend/src/trpc/router';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

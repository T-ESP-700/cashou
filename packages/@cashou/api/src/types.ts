// Re-export AppRouter type from client (which imports from backend)
export type { AppRouter } from './client';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

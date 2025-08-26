export type { AppRouter } from '../../../apps/backend/src/routers';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
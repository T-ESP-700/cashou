// Re-export AppRouter type from backend
// This is a placeholder that will be overridden by the actual AppRouter type at build time
export type AppRouter = any;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

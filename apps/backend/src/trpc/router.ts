import { router, publicProcedure } from './index';
import { userRouter } from './routers/user';
import { authRouter } from './routers/auth';

// Main tRPC router
export const trpcRouter = router({
  auth: authRouter,
  user: userRouter,
  
  // Health check
  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })),
});

export type AppRouter = typeof trpcRouter;
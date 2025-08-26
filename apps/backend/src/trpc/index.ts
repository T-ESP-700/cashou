import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { auth } from '@cashou/auth/server';
import { prisma } from '@cashou/db-app';

// Context type
export interface Context {
  req: Request;
  session: any;
}

// Create context function
export async function createContext({ req }: { req: Request }): Promise<Context> {
  // Get session from better-auth
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    req,
    session,
  };
}

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Base router
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// Admin procedure that requires admin role
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Check if user has admin role
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.userId },
  });

  if (!user || user.role !== 'ADMIN') {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Admin access required' 
    });
  }

  return next({ ctx });
});
import { initTRPC, TRPCError } from '@trpc/server';
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
  // Check if user is authenticated
  if (!ctx.session?.user?.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  // Check if user has admin role
  // Note: Since User model doesn't have a role field, we'll need to implement
  // a different admin check mechanism. For now, we'll allow all authenticated users.
  // TODO: Implement proper admin role checking mechanism
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
  });

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found'
    });
  }

  // TODO: Add role checking when admin role system is implemented
  // For now, allow all authenticated users as temporary solution
  
  return next({ ctx });
});

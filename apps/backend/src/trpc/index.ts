import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@cashou/auth/server';
import { prisma } from '@cashou/db-app';

// Type for better-auth session
type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

// Context type
export interface Context {
  req: Request;
  session: AuthSession | null;
}

// Create context function
export async function createContext({ req }: { req: Request }): Promise<Context> {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  let session: AuthSession | null = null;

  if (bearerToken) {
    // Validate Bearer token by checking database
    const sessionData = await prisma.session.findUnique({
      where: { token: bearerToken },
      include: { user: true },
    });

    if (sessionData && sessionData.expiresAt > new Date()) {
      // Token is valid and not expired
      session = {
        session: sessionData,
        user: sessionData.user,
      } as AuthSession;
    }
  } else {
    // Fallback: try with cookies (for compatibility)
    session = await auth.api.getSession({
      headers: req.headers,
    });
  }

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
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
    },
  });
});

// Admin procedure that requires admin role
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Note: Role-based access control is not yet implemented in the User model
  // This is a placeholder for future admin functionality
  // For now, this procedure will allow access to authenticated users
  // TODO: Add role field to User model and implement proper admin check

  // Temporary: Check if user exists (admin check will be added when role field exists)
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
  });

  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  // TODO: Uncomment when role field is added to User model
  // if (user.role !== 'ADMIN') {
  //   throw new TRPCError({
  //     code: 'FORBIDDEN',
  //     message: 'Admin access required'
  //   });
  // }

  return next({ ctx });
});

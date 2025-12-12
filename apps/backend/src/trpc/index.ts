import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@cashou/auth/server';
import { prisma } from '@cashou/db-app';
import { PrismaClient as BackofficePrismaClient } from '@cashou/db-backoffice';
import { verifyBackofficeToken } from '../lib/backoffice-token';

// Type for better-auth session
type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

interface BackofficeAdminContext {
  id: number;
  email: string;
  name: string | null;
  roles: string[];
}

// Context type
export interface Context {
  req: Request;
  session: AuthSession | null;
  backofficeAdmin: BackofficeAdminContext | null;
}

const backofficePrisma = new BackofficePrismaClient();

// Create context function
export async function createContext({ req }: { req: Request }): Promise<Context> {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const backofficeHeader = req.headers.get('backoffice') ?? req.headers.get('Backoffice');
  const backofficeTokenHeader = backofficeHeader
    ?? (authHeader?.startsWith('Backoffice ') ? authHeader.substring('Backoffice '.length) : null);

  let session: AuthSession | null = null;
  let backofficeAdmin: BackofficeAdminContext | null = null;

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

  const candidateBackofficeToken = backofficeTokenHeader ?? (!session ? bearerToken : null);
  if (candidateBackofficeToken) {
    const payload = verifyBackofficeToken(candidateBackofficeToken);
    if (payload) {
      const admin = await backofficePrisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });

      if (admin) {
        backofficeAdmin = {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          roles: admin.roles.map((ur) => ur.role.name),
        };
      }
    }
  }

  return {
    req,
    session,
    backofficeAdmin,
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

export const protectedOrBackofficeProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (ctx.session && ctx.session.user) {
    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        userId: ctx.session.user.id,
      },
    });
  }

  if (ctx.backofficeAdmin) {
    return next({
      ctx: {
        ...ctx,
        backofficeAdmin: ctx.backofficeAdmin,
      },
    });
  }

  throw new TRPCError({ code: 'UNAUTHORIZED' });
});

// Admin procedure that requires admin role
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (ctx.backofficeAdmin) {
    return next({
      ctx: {
        ...ctx,
        backofficeAdmin: ctx.backofficeAdmin,
      },
    });
  }

  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
  });

  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
    },
  });
});

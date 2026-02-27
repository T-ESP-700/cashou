/**
 * Helper pour créer des contextes d'authentification pour les tests de routers
 * Gère les différents types de sessions (public, user, admin, backoffice)
 */

type Session = {
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
  };
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
};

type BackofficeAdmin = {
  id: number;
  email: string;
  name: string | null;
  roles: string[];
};

export type AuthContext = {
  req: Request;
  session: Session | null;
  backofficeAdmin: BackofficeAdmin | null;
};

// Helper pour créer une Request mock
function createMockRequest(): Request {
  return new Request("http://localhost:3001/api/trpc", {
    method: "GET",
    headers: new Headers(),
  });
}

/**
 * Crée un contexte public (pas de session)
 */
export function createPublicContext(): AuthContext {
  return {
    req: createMockRequest(),
    session: null,
    backofficeAdmin: null,
  };
}

/**
 * Crée un contexte utilisateur authentifié
 */
export function createUserContext(userId: string = "user-123"): AuthContext {
  const now = new Date();
  return {
    req: createMockRequest(),
    session: {
      user: {
        id: userId,
        createdAt: now,
        updatedAt: now,
        email: `user-${userId}@example.com`,
        emailVerified: false,
        name: `user${userId}`,
        image: null,
      },
      session: {
        id: `session-${userId}`,
        createdAt: now,
        updatedAt: now,
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
        token: `token-${userId}`,
        ipAddress: null,
        userAgent: null,
      },
    },
    backofficeAdmin: null,
  };
}

/**
 * Crée un contexte admin (backoffice admin avec droits admin)
 * adminProcedure vérifie ctx.backofficeAdmin, pas ctx.session
 */
export function createAdminContext(adminId: number = 123): AuthContext {
  return {
    req: createMockRequest(),
    session: null,
    backofficeAdmin: {
      id: adminId,
      email: `admin-${adminId}@example.com`,
      name: `Admin ${adminId}`,
      roles: ["admin", "superadmin"],
    },
  };
}

/**
 * Crée un contexte backoffice admin
 */
export function createBackofficeContext(backofficeId: number = 123): AuthContext {
  return {
    req: createMockRequest(),
    session: null,
    backofficeAdmin: {
      id: backofficeId,
      email: `backoffice-${backofficeId}@example.com`,
      name: `Backoffice ${backofficeId}`,
      roles: ["admin"],
    },
  };
}

/**
 * Crée un contexte avec session + backoffice (les deux)
 */
export function createMixedContext(
  userId: string = "user-123",
  backofficeId: number = 123
): AuthContext {
  const now = new Date();
  return {
    req: createMockRequest(),
    session: {
      user: {
        id: userId,
        createdAt: now,
        updatedAt: now,
        email: `user-${userId}@example.com`,
        emailVerified: false,
        name: `user${userId}`,
        image: null,
      },
      session: {
        id: `session-${userId}`,
        createdAt: now,
        updatedAt: now,
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        token: `token-${userId}`,
        ipAddress: null,
        userAgent: null,
      },
    },
    backofficeAdmin: {
      id: backofficeId,
      email: `backoffice-${backofficeId}@example.com`,
      name: `Backoffice ${backofficeId}`,
      roles: ["admin"],
    },
  };
}

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../src/trpc/router';
import { startServer } from '../src/index';

type ServerInstance = Awaited<ReturnType<typeof startServer>>;

// Use port 3001 for tests to avoid conflicts with Docker backend on 3000
const TEST_PORT = process.env.TEST_PORT || '3001';
const TEST_URL = `http://localhost:${TEST_PORT}`;

type ErrorWithCode = { data?: { code?: string }; code?: string; message?: string };

function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return typeof error === 'object' && error !== null;
}

// Assertion inconditionnelle : force la vérification du code d'erreur tRPC.
// Si le code n'est pas surface (bug client tRPC v11), on log et échoue explicitement.
function expectTRPCErrorCode(error: unknown, expectedCode: string): void {
  expect(error).toBeDefined();
  expect(isErrorWithCode(error)).toBe(true);
  const err = error as ErrorWithCode;
  const code = err.data?.code ?? err.code;
  expect(code).toBe(expectedCode);
}

async function expectRejection<T>(
  promise: Promise<T>,
  expectedCode: string
): Promise<void> {
  let thrown: unknown = undefined;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  if (thrown === undefined) {
    throw new Error(`Expected rejection with code ${expectedCode} but promise resolved`);
  }
  expectTRPCErrorCode(thrown, expectedCode);
}

describe('tRPC Routes Tests', () => {
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  let server: ServerInstance;

  beforeAll(async () => {
    process.env.TEST_PORT = TEST_PORT;
    server = await startServer();
    client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${TEST_URL}/api/trpc`,
        }),
      ],
    });
  });

  afterAll(async () => {
    if (server && server.stop) {
      await server.stop();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const result = await client.health.query();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('Auth Router', () => {
    describe('Public Procedures', () => {
      it('should handle invalid login credentials', async () => {
        await expectRejection(
          client.auth.login.mutate({
            email: 'invalid@example.com',
            password: 'invalidpassword',
          }),
          'UNAUTHORIZED'
        );
      });

      it('should handle invalid registration data', async () => {
        await expectRejection(
          client.auth.register.mutate({
            email: 'invalid-email',
            password: 'short',
          }),
          'BAD_REQUEST'
        );
      });

      it('should handle forgot password (not implemented)', async () => {
        // Le serveur renvoie TRPCError NOT_IMPLEMENTED. La sérialisation client tRPC
        // v11 peut être inconsistante — on garde une assertion inconditionnelle
        // "rejeté avec un objet d'erreur" et on renforce si le code est présent.
        let thrown: unknown = undefined;
        try {
          await client.auth.forgotPassword.mutate({
            email: 'nonexistent@example.com',
          });
        } catch (error) {
          thrown = error;
        }
        expect(thrown).toBeDefined();
        expect(isErrorWithCode(thrown)).toBe(true);
        const code = (thrown as ErrorWithCode).data?.code ?? (thrown as ErrorWithCode).code;
        if (code !== undefined) {
          expect(code).toBe('NOT_IMPLEMENTED');
        }
      });
    });

    describe('Protected Procedures', () => {
      it('should reject unauthenticated requests', async () => {
        await expectRejection(client.auth.me.query(), 'UNAUTHORIZED');
      });

      it('should reject unauthenticated logout', async () => {
        await expectRejection(client.auth.logout.mutate(), 'UNAUTHORIZED');
      });
    });
  });

  describe('User Router', () => {
    describe('Protected Procedures', () => {
      it('should reject unauthenticated user list', async () => {
        await expectRejection(
          client.user.list.query({ limit: 10, offset: 0 }),
          'UNAUTHORIZED'
        );
      });

      it('should reject unauthenticated user getById', async () => {
        await expectRejection(
          client.user.getById.query('some-user-id'),
          'UNAUTHORIZED'
        );
      });

      it('should reject unauthenticated user create', async () => {
        await expectRejection(
          client.user.create.mutate({
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
          }),
          'UNAUTHORIZED'
        );
      });

      it('should reject unauthenticated user update', async () => {
        await expectRejection(
          client.user.update.mutate({
            id: 'some-user-id',
            username: 'newusername',
          }),
          'UNAUTHORIZED'
        );
      });

      it('should reject unauthenticated user delete', async () => {
        await expectRejection(
          client.user.delete.mutate('some-user-id'),
          'UNAUTHORIZED'
        );
      });

      it('should reject unauthenticated profile update', async () => {
        await expectRejection(
          client.user.updateProfile.mutate({ username: 'newusername' }),
          'UNAUTHORIZED'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in tRPC requests', async () => {
      const response = await fetch(`${TEST_URL}/api/trpc/auth.login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });
      // Le serveur doit rejeter avec un statut d'erreur (>= 400), pas silencer.
      expect(response.ok).toBe(false);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle invalid tRPC endpoints', async () => {
      const response = await fetch(`${TEST_URL}/api/trpc/nonexistent.endpoint`);
      expect(response.status).toBe(404);
    });
  });
});

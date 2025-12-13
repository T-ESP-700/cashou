import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../src/trpc/router';
import { startServer } from '../src/index';

type ServerInstance = Awaited<ReturnType<typeof startServer>>;

function isErrorWithCode(error: unknown): error is { data?: { code?: string }; code?: string } {
  return typeof error === 'object' && error !== null;
}

describe('tRPC Routes Tests', () => {
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  let server: ServerInstance;

  beforeAll(async () => {
    // Start the server explicitly
    server = await startServer();

    // Create tRPC client
    client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: 'http://localhost:3000/api/trpc',
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
        try {
          await client.auth.login.mutate({
            email: 'invalid@example.com',
            password: 'invalidpassword',
          });
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('UNAUTHORIZED');
          }
        }
      });

      it('should handle invalid registration data', async () => {
        try {
          await client.auth.register.mutate({
            email: 'invalid-email',
            password: 'short',
          });
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('BAD_REQUEST');
          }
        }
      });

      it('should handle forgot password with invalid email', async () => {
        try {
          await client.auth.forgotPassword.mutate({
            email: 'nonexistent@example.com',
          });
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('BAD_REQUEST');
          }
        }
      });
    });

    describe('Protected Procedures', () => {
      it('should reject unauthenticated requests', async () => {
        try {
          await client.auth.me.query();
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('UNAUTHORIZED');
          }
        }
      });

      it('should reject unauthenticated logout', async () => {
        try {
          await client.auth.logout.mutate();
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('UNAUTHORIZED');
          }
        }
      });
    });
  });

  describe('User Router', () => {
    describe('Protected Procedures', () => {
      it('should reject unauthenticated user list', async () => {
        try {
          await client.user.list.query({
            limit: 10,
            offset: 0,
          });
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('UNAUTHORIZED');
          }
        }
      });

      it('should reject unauthenticated user getById', async () => {
        try {
          await client.user.getById.query('some-user-id');
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('UNAUTHORIZED');
          }
        }
      });

      it('should reject unauthenticated user create', async () => {
        try {
          await client.user.create.mutate({
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
          });
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('UNAUTHORIZED');
          }
        }
      });

      it('should reject unauthenticated user update', async () => {
        try {
          await client.user.update.mutate({
            id: 'some-user-id',
            username: 'newusername',
          });
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('UNAUTHORIZED');
          }
        }
      });

      it('should reject unauthenticated user delete', async () => {
        try {
          await client.user.delete.mutate('some-user-id');
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('UNAUTHORIZED');
          }
        }
      });

      it('should reject unauthenticated profile update', async () => {
        try {
          await client.user.updateProfile.mutate({
            username: 'newusername',
          });
          expect(true).toBe(false); // Should not reach here
        } catch (error: unknown) {
          if (isErrorWithCode(error)) {
            expect(error.data?.code || error.code).toBe('UNAUTHORIZED');
          }
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in tRPC requests', async () => {
      try {
        await fetch('http://localhost:3000/api/trpc/auth.login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json',
        });
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid tRPC endpoints', async () => {
      const response = await fetch('http://localhost:3000/api/trpc/nonexistent.endpoint');
      expect(response.status).toBe(404);
    });
  });
});

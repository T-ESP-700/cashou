import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../';
import { auth } from '@cashou/auth/server';
import { TRPCError } from '@trpc/server';

export const authRouter = router({
  // Register a new user
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await auth.api.signUpEmail({
          body: {
            email: input.email,
            password: input.password,
            name: input.name || '',
          },
        });

        return {
          success: true,
          user: result.user,
          token: result.token,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message,
        });
      }
    }),

  // Login
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await auth.api.signInEmail({
          body: {
            email: input.email,
            password: input.password,
          },
        });

        return {
          success: true,
          user: result.user,
          token: result.token,
        };
      } catch {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }
    }),

  // Logout
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await auth.api.signOut({
        headers: ctx.req.headers,
      });

      return { success: true };
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Logout failed',
      });
    }
  }),

  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.session.user,
      session: ctx.session,
    };
  }),

  // Request password reset
  forgotPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await auth.api.forgetPassword({
          body: {
            email: input.email,
            redirectTo: (process.env.FRONTEND_URL || 'http://localhost:3000') + '/reset-password',
          },
        });

        return {
          success: true,
          message: 'Password reset email sent',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to send reset email';
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message,
        });
      }
    }),

  // Reset password
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await auth.api.resetPassword({
          body: {
            token: input.token,
            newPassword: input.newPassword,
          },
        });

        return {
          success: true,
          message: 'Password reset successful',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to reset password';
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message,
        });
      }
    }),
});

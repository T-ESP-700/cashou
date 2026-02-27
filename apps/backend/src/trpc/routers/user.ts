import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, publicProcedure, protectedOrBackofficeProcedure } from '..';
import { prisma } from '@cashou/db-app';
import { TRPCError } from '@trpc/server';
import { hash } from '@cashou/auth/server';
import { UserService } from '../services/user.service';
import type { UserProfileUpdateData } from '../types/user.types';

export const userRouter = router({
  // Get all users without pagination
  getAll: publicProcedure
    .query(async () => {
      const userService = new UserService();
      const users = await userService.findAll();
      return users;
    }),

  // Get all users (admin only)
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const where = input.search
        ? {
          OR: [
            { email: { contains: input.search, mode: 'insensitive' as const } },
            { username: { contains: input.search, mode: 'insensitive' as const } },
          ],
        }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          select: {
            id: true,
            email: true,
            username: true,
            levelId: true,
            level: true,
            points: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        hasMore: input.offset + users.length < total,
      };
    }),

  // Get user by ID (admin or self)
  getById: protectedOrBackofficeProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      // Check if user is admin or requesting their own data
      const currentUserId = ctx.session?.user?.id;
      const isSelf = currentUserId === input;
      const isBackofficeAdmin = Boolean(ctx.backofficeAdmin);

      if (!isSelf && !isBackofficeAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own profile',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: input },
        include: {
          wallets: true,
          gameInstances: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  // Admin: get any user by ID
  adminGetById: adminProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input },
        include: {
          wallets: true,
          gameInstances: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  // Create user (admin only)
  create: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(8),
        levelId: z.number().int().min(1).default(1),
        points: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ input }) => {
      // Check if user already exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: input.email },
            { username: input.username },
          ],
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: existing.email === input.email
            ? 'Email already exists'
            : 'Username already exists',
        });
      }

      // Hash password for account
      const hashedPassword = await hash.password(input.password);

      // Create user with account (Better-Auth stores password in Account)
      const user = await prisma.user.create({
        data: {
          email: input.email,
          username: input.username,
          levelId: input.levelId,
          points: input.points,
          accounts: {
            create: {
              accountId: input.email,
              providerId: 'credential',
              password: hashedPassword,
            },
          },
        },
      });

      return {
        success: true,
        user,
      };
    }),

  // Update user (admin or self for limited fields)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email().optional(),
        username: z.string().min(3).optional(),
        password: z.string().min(8).optional(),
        levelId: z.number().int().min(1).optional(),
        points: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, password, ...updateFields } = input;

      // Check permissions
      const currentUserId = ctx.session?.user?.id;
      if (!currentUserId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      // TODO: Implement admin check when role system is available
      const isAdmin = false; // Temporary: no admin role system yet
      const isSelf = currentUserId === id;

      if (!isAdmin && !isSelf) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
        });
      }

      // Non-admin users can only update their own username
      if (!isAdmin && (input.levelId || input.points || input.email)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your username',
        });
      }

      // Check if email or username already exists
      if (input.email || input.username) {
        const existing = await prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: id } },
              {
                OR: [
                  input.email ? { email: input.email } : {},
                  input.username ? { username: input.username } : {},
                ],
              },
            ],
          },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: existing.email === input.email
              ? 'Email already exists'
              : 'Username already exists',
          });
        }
      }

      // Build update data
      const updateData: { email?: string; username?: string; levelId?: number; points?: number } = {};
      if (updateFields.email) updateData.email = updateFields.email;
      if (updateFields.username) updateData.username = updateFields.username;
      if (updateFields.levelId) updateData.levelId = updateFields.levelId;
      if (updateFields.points !== undefined) updateData.points = updateFields.points;

      // Update password in Account table if provided
      if (password) {
        const hashedPassword = await hash.password(password);
        await prisma.account.updateMany({
          where: { userId: id, providerId: 'credential' },
          data: { password: hashedPassword },
        });
      }

      // Update user
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        user,
      };
    }),

  // Delete user (admin only)
  delete: adminProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      // Prevent self-deletion
      const currentUserId = ctx.session?.user?.id;
      if (!currentUserId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      if (currentUserId === input) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot delete your own account',
        });
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: input },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Delete user (cascade delete should handle related records)
      await prisma.user.delete({
        where: { id: input },
      });

      return {
        success: true,
        message: 'User deleted successfully',
      };
    }),

  // Update own profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(8).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }
      const updateData: UserProfileUpdateData = {};

      // If changing password, verify current password
      if (input.newPassword) {
        if (!input.currentPassword) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Current password is required to change password',
          });
        }

        // Get password from Account table (Better-Auth stores it there)
        const account = await prisma.account.findFirst({
          where: { userId, providerId: 'credential' },
        });

        if (!account?.password) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No credential account found',
          });
        }

        const isValid = await hash.verify(input.currentPassword, account.password);
        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Current password is incorrect',
          });
        }

        // Update password in Account table
        const hashedPassword = await hash.password(input.newPassword);
        await prisma.account.updateMany({
          where: { userId, providerId: 'credential' },
          data: { password: hashedPassword },
        });
      }

      // Update username if provided
      if (input.username) {
        const existing = await prisma.user.findFirst({
          where: {
            username: input.username,
            id: { not: userId },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Username already exists',
          });
        }

        updateData.username = input.username;
      }

      // Update user (only username now, password handled above)
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          level: true,
          points: true,
          levelId: true,
        },
      });

      return {
        success: true,
        user,
      };
    }),

  // Update Expo push token for push notifications
  updateExpoPushToken: protectedProcedure
    .input(
      z.object({
        expoPushToken: z.string().min(1, 'Push token is required'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { expoPushToken: input.expoPushToken },
        select: {
          id: true,
          email: true,
          expoPushToken: true,
        },
      });

      console.log(`[User] Updated Expo push token for user ${userId}`);

      return {
        success: true,
        user,
      };
    }),
});

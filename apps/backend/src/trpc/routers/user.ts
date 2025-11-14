import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '..';
import { prisma } from '@cashou/db-app';
import { TRPCError } from '@trpc/server';
import { hash } from '@cashou/auth/server';
import { UserService } from '../services/user.service';

export const userRouter = router({
  // Get all users without pagination
  getAll: adminProcedure
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
            role: true,
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
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      // Check if user is admin or requesting their own data
      const currentUserId = ctx.session?.user?.id;
      if (!currentUserId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      if (currentUserId !== input) {
        // TODO: Implement admin check when role system is available
        // For now, users can only view their own profile
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

  // Create user (admin only)
  create: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(8),
        role: z.enum(['USER', 'ADMIN']).default('USER'),
        level: z.number().int().min(1).default(1),
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

      // Hash password
      const hashedPassword = await hash.password(input.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: input.email,
          username: input.username,
          hashedPassword,
          role: input.role,
          level: input.level,
          points: input.points,
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
        role: z.enum(['USER', 'ADMIN']).optional(),
        level: z.number().int().min(1).optional(),
        points: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

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
      if (!isAdmin && (input.role || input.level || input.points || input.email)) {
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

      // Hash password if provided
      if (input.password) {
        (updateData as any).hashedPassword = await hash.password(input.password);
        delete (updateData as any).password;
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
      const updateData: any = {};

      // If changing password, verify current password
      if (input.newPassword) {
        if (!input.currentPassword) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Current password is required to change password',
          });
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        const isValid = await hash.verify(input.currentPassword, user!.hashedPassword);
        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Current password is incorrect',
          });
        }

        updateData.hashedPassword = await hash.password(input.newPassword);
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

      // Update user
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          level: true,
          points: true,
          role: true,
        },
      });

      return {
        success: true,
        user,
      };
    }),
});

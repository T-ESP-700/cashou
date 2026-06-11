/**
 * Router d'authentification pour le backoffice
 * Utilise la DB backoffice pour vérifier les credentials
 */

import { router, publicProcedure } from '../trpc/index'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { TRPCError } from '@trpc/server'
import { backofficePrisma as backofficeDb } from '../database-backoffice'
import { generateBackofficeToken, verifyBackofficeToken } from '../lib/backoffice-token'

export const backofficeAuthRouter = router({
  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password } = input

      // Trouver l'utilisateur
      const user = await backofficeDb.user.findUnique({
        where: { email },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Email ou mot de passe incorrect',
        })
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password)

      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Email ou mot de passe incorrect',
        })
      }

      const token = generateBackofficeToken(user.id)

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles.map((ur: { role: { name: string } }) => ur.role.name),
        },
        token,
      }
    }),

  verify: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const payload = verifyBackofficeToken(input.token)
        if (!payload) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Token invalide',
          })
        }

        const user = await backofficeDb.user.findUnique({
          where: { id: payload.userId },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        })

        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Token invalide',
          })
        }

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles.map((ur: { role: { name: string } }) => ur.role.name),
          },
        }
      } catch {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Token invalide',
        })
      }
    }),
})

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../index.ts";
import { LevelCompletionService } from "../services/level-completion.service.ts";
import prisma from "../../database.ts";

const levelCompletionService = new LevelCompletionService();

const levelNumberSchema = z.object({
  levelNumber: z.number().int().positive(),
});

export const levelCompletionRouter = router({
  /**
   * Whether the user has a completion record for the level with this number
   * (any stars / partial progress still creates a row after first game end flow).
   */
  hasCompletedLevelByNumber: protectedProcedure
    .input(levelNumberSchema)
    .query(async ({ ctx, input }) => {
      return await levelCompletionService.hasCompletionForLevelNumber(
        ctx.userId,
        input.levelNumber
      );
    }),

  /**
   * Dev / QA only: removes UserLevelCompletion for level number 1 so the guided tour can run again.
   */
  resetLevel1TourDev: protectedProcedure.mutation(async ({ ctx }) => {
    if (process.env.NODE_ENV === "production") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not available in production" });
    }
    const level = await prisma.level.findFirst({
      where: { number: 1 },
      select: { id: true },
    });
    if (!level) {
      return { deleted: false as const };
    }
    await prisma.userLevelCompletion.deleteMany({
      where: { userId: ctx.userId, levelId: level.id },
    });
    return { deleted: true as const };
  }),
});

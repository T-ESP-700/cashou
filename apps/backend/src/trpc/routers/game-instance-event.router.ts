import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { GameInstanceEventService } from "../services/game-instance-event.service";

const t = initTRPC.create();
const gameInstanceEventService = new GameInstanceEventService();

export const gameInstanceEventRouter = t.router({
  /**
   * Récupère tous les événements d'une instance de jeu
   * Endpoint: GET http://localhost:3000/api/trpc/gameInstanceEvent.findByGameInstance?input={"gameInstanceId":1}
   */
  findByGameInstance: t.procedure
    .input(z.object({ gameInstanceId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return await gameInstanceEventService.findByGameInstance(input.gameInstanceId);
    }),

  /**
   * Récupère tous les événements dus (non déclenchés et scheduledAt <= now)
   * Endpoint: GET http://localhost:3000/api/trpc/gameInstanceEvent.findDue
   */
  findDue: t.procedure.query(async () => {
    return await gameInstanceEventService.findDueEvents();
  }),
});

export type GameInstanceEventRouter = typeof gameInstanceEventRouter;

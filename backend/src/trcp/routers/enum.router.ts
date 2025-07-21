// src/server/routers/enum.router.ts
import { initTRPC } from "@trpc/server";
import { EnumService } from "../../services/enum.service";

const t = initTRPC.create();
const enumSvc = new EnumService();

export const enumRouter = t.router({
    /** GET /trpc/quizTypes */
    quizTypes: t.procedure.query(() => {
        return enumSvc.getQuizTypes();
    }),

    /** GET /trpc/notificationTypes */
    notificationTypes: t.procedure.query(() => {
        return enumSvc.getNotificationTypes();
    }),
});

export type EnumRouter = typeof enumRouter;

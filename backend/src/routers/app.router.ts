// Router principal de l'application - Point central de regroupement de tous les sous-routers
import { initTRPC } from "@trpc/server";
import {levelRouter} from "./level.router.ts";
import {eventRouter} from "./event.router.ts";
import {goalRouter} from "./goal.router.ts";
import { levelGoalRouter } from "./level-goal.router.ts";
import { levelEventRouter } from "./level-event.router.ts";
import {marketRouter} from "./market.router.ts";
import {submarketRouter} from "./submarket.router.ts";
import {fieldRouter} from "./field.router.ts";
import {assetRouter} from "./asset.router.ts";
import {assetHistoryRouter} from "./asset-history.router.ts";
import {eventAssetRouter} from "./event-asset.router.ts";
import {impactRouter} from "./impact.router.ts";
import {quizRouter} from "./quiz.router.ts";
import {questionRouter} from "./question.router.ts";
import {quizQuestionRouter} from "./quiz-question.router.ts";
import {answerRouter} from "./answer.router.ts";
import {userRouter} from "./user.router.ts";
import {userQuizRouter} from "./user-quiz.router.ts";
import {userAnswerRouter} from "./user-answer.router.ts";

// Initialisation de tRPC - Framework pour créer des APIs type-safe
const t = initTRPC.create();

// Router principal qui regroupe tous les sous-routers de l'application
export const appRouter = t.router({
    level: levelRouter,
    event: eventRouter,
    goal: goalRouter,
    levelGoal: levelGoalRouter,
    levelEvent: levelEventRouter,
    market: marketRouter,
    submarket: submarketRouter,
    field: fieldRouter,
    asset: assetRouter,
    assetHistory: assetHistoryRouter,
    eventAsset: eventAssetRouter,
    impact: impactRouter,
    quiz: quizRouter,
    question: questionRouter,
    quizQuestion: quizQuestionRouter,
    answer: answerRouter,
    user: userRouter,
    userQuiz: userQuizRouter,
    userAnswer: userAnswerRouter,
});

// Export du type pour utilisation côté frontend (type-safety)
// Permet au frontend de connaître exactement les routes disponibles et leurs types
export type AppRouter = typeof appRouter;

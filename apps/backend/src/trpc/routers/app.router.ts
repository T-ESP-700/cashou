// Router principal de l'application - Point central de regroupement de tous les sous-routers
import { initTRPC } from "@trpc/server";
import {levelRouter} from "./level.router.js";
import {eventRouter} from "./event.router.js";
import {goalRouter} from "./goal.router.js";
import { levelGoalRouter } from "./level-goal.router.js";
import { levelEventRouter } from "./level-event.router.js";
import {marketRouter} from "./market.router.js";
import {submarketRouter} from "./submarket.router.js";
import {fieldRouter} from "./field.router.js";
import {assetRouter} from "./asset.router.js";
import {assetHistoryRouter} from "./asset-history.router.js";
import {eventAssetRouter} from "./event-asset.router.js";
import {impactRouter} from "./impact.router.js";
import {quizRouter} from "./quiz.router.js";
import {questionRouter} from "./question.router.js";
import {quizQuestionRouter} from "./quiz-question.router.js";
import {answerRouter} from "./answer.router.js";
import {userRouter} from "./user.router.js";
import {userQuizRouter} from "./user-quiz.router.js";
import {userAnswerRouter} from "./user-answer.router.js";

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

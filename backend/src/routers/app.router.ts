// Router principal de l'application - Point central de regroupement de tous les sous-routers
import { initTRPC } from "@trpc/server";
import {levelRouter} from "./level.router.ts";
import {quizRouter} from "./quiz.router.ts";
import {questionRouter} from "./question.router.ts";
import {quizQuestionRouter} from "./quiz-question.router.ts";
import {answerRouter} from "./answer.router.ts";

// Initialisation de tRPC - Framework pour créer des APIs type-safe
const t = initTRPC.create();

// Router principal qui regroupe tous les sous-routers de l'application
export const appRouter = t.router({
    level: levelRouter,
    quiz: quizRouter,
    question: questionRouter,
    quizQuestion: quizQuestionRouter,
    answer: answerRouter,
});

// Export du type pour utilisation côté frontend (type-safety)
// Permet au frontend de connaître exactement les routes disponibles et leurs types
export type AppRouter = typeof appRouter;
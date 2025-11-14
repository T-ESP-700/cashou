// Router principal de l'application - Point central de regroupement de tous les sous-routers
import { initTRPC } from "@trpc/server";
import { levelRouter } from "./level.router.ts";
import { eventRouter } from "./event.router.ts";
import { goalRouter } from "./goal.router.ts";
import { levelGoalRouter } from "./level-goal.router.ts";
import { levelEventRouter } from "./level-event.router.ts";
import { marketRouter } from "./market.router.ts";
import { submarketRouter } from "./submarket.router.ts";
import { fieldRouter } from "./field.router.ts";
import { assetRouter } from "./asset.router.ts";
import { assetHistoryRouter } from "./asset-history.router.ts";
import { eventAssetRouter } from "./event-asset.router.ts";
import { impactRouter } from "./impact.router.ts";
import { quizRouter } from "./quiz.router.ts";
import { questionRouter } from "./question.router.ts";
import { quizQuestionRouter } from "./quiz-question.router.ts";
import { answerRouter } from "./answer.router.ts";
import { userRouter } from "./user.router.ts";
import { userQuizRouter } from "./user-quiz.router.ts";
import { userAnswerRouter } from "./user-answer.router.ts";
import { notificationRouter } from "./notification.router.ts";
import { transactionRouter } from "./transaction.router.ts";
import { walletRouter } from "./wallet.router.ts";
import { gameInstanceRouter } from "./game-instance.router.ts";
import { gameUserRouter } from "./game_user.router.ts";

const t = initTRPC.create();

export const appRouter = t.router({
    /**
     * Gestion des niveaux de jeu.
     * Permet de créer, lire, mettre à jour et supprimer des niveaux.
     */
    level: levelRouter,

    /**
     * Gestion des événements dans le jeu.
     * Associés à des niveaux, ils peuvent influencer le déroulement du jeu.
     */
    event: eventRouter,

    /**
     * Gestion des objectifs à atteindre.
     * Les objectifs sont des buts que les joueurs doivent accomplir.
     */
    goal: goalRouter,

    /**
     * Association entre les niveaux et les objectifs.
     * Définit quels objectifs sont présents dans chaque niveau.
     */
    levelGoal: levelGoalRouter,

    /**
     * Association entre les niveaux et les événements.
     * Définit quels événements peuvent survenir dans chaque niveau.
     */
    levelEvent: levelEventRouter,

    /**
     * Gestion des marchés financiers.
     * Représente les différents marchés où les actifs peuvent être échangés.
     */
    market: marketRouter,

    /**
     * Gestion des sous-marchés.
     * Une subdivision des marchés pour une classification plus fine des actifs.
     */
    submarket: submarketRouter,

    /**
     * Gestion des domaines ou secteurs d'activité.
     * Permet de catégoriser les actifs et les marchés.
     */
    field: fieldRouter,

    /**
     * Gestion des actifs financiers.
     * Représente les actions, obligations, etc., que les joueurs peuvent acheter ou vendre.
     */
    asset: assetRouter,

    /**
     * Historique des prix des actifs.
     * Permet de suivre l'évolution de la valeur des actifs dans le temps.
     */
    assetHistory: assetHistoryRouter,

    /**
     * Association entre les événements et les actifs.
     * Définit comment un événement affecte un ou plusieurs actifs.
     */
    eventAsset: eventAssetRouter,

    /**
     * Gestion de l'impact des événements sur les actifs.
     * Mesure la magnitude de l'effet d'un événement sur un actif.
     */
    impact: impactRouter,

    /**
     * Gestion des quiz.
     * Les quiz sont des séries de questions posées aux joueurs.
     */
    quiz: quizRouter,

    /**
     * Gestion des questions des quiz.
     * Chaque question est une interrogation spécifique dans un quiz.
     */
    question: questionRouter,

    /**
     * Association entre les quiz et les questions.
     * Définit quelles questions composent un quiz.
     */
    quizQuestion: quizQuestionRouter,

    /**
     * Gestion des réponses aux questions des quiz.
     * Contient les options de réponse pour chaque question.
     */
    answer: answerRouter,

    /**
     * Gestion des utilisateurs de l'application.
     * Permet de gérer les profils, l'authentification, etc.
     */
    user: userRouter,

    /**
     * Suivi des quiz faits par les utilisateurs.
     * Enregistre les performances des utilisateurs aux quiz.
     */
    userQuiz: userQuizRouter,

    /**
     * Enregistrement des réponses des utilisateurs aux questions.
     * Permet d'analyser les réponses et de calculer les scores.
     */
    userAnswer: userAnswerRouter,

    /**
     * Gestion des notifications envoyées aux utilisateurs.
     * Permet d'informer les joueurs d'événements importants.
     */
    notification: notificationRouter,

    /**
     * Gestion des transactions financières des utilisateurs.
     * Enregistre les achats et les ventes d'actifs.
     */
    transaction: transactionRouter,

    /**
     * Gestion des portefeuilles des utilisateurs.
     * Contient les actifs possédés par chaque joueur et leur solde.
     */
    wallet: walletRouter,

    /**
     * Gestion des instances de jeu.
     * Une instance représente une partie en cours avec ses propres données.
     */
    gameInstance: gameInstanceRouter,

    /**
     * Gestion des utilisateurs au sein d'une partie.
     * Associe un utilisateur à une instance de jeu avec un rôle spécifique.
     */
    gameUser: gameUserRouter,
});

export type AppRouter = typeof appRouter;

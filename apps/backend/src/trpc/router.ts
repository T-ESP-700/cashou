import { router, publicProcedure } from './index';
import { userRouter } from './routers/user';
import { authRouter } from './routers/auth';
import { levelRouter } from './routers/level.router';
import { eventRouter } from './routers/event.router';
import { goalRouter } from './routers/goal.router';
import { levelGoalRouter } from './routers/level-goal.router';
import { levelEventRouter } from './routers/level-event.router';
import { marketRouter } from './routers/market.router';
import { submarketRouter } from './routers/submarket.router';
import { fieldRouter } from './routers/field.router';
import { assetRouter } from './routers/asset.router';
import { assetHistoryRouter } from './routers/asset-history.router';
import { eventAssetRouter } from './routers/event-asset.router';
import { impactRouter } from './routers/impact.router';
import { quizRouter } from './routers/quiz.router';
import { questionRouter } from './routers/question.router';
import { quizQuestionRouter } from './routers/quiz-question.router';
import { answerRouter } from './routers/answer.router';
import { userQuizRouter } from './routers/user-quiz.router';
import { userAnswerRouter } from './routers/user-answer.router';
import { backofficeAuthRouter } from '../routers/backoffice-auth';
import { gameInstanceRouter } from './routers/game-instance.router';
import { gameUserRouter } from './routers/game_user.router';
import { walletRouter } from './routers/wallet.router';
import { transactionRouter } from './routers/transaction.router';
import { notificationRouter } from './routers/notification.router';
import { dicoEntryRouter } from './routers/dico-entry.router';

// Main tRPC router
export const trpcRouter = router({
  // Authentication
  auth: authRouter,
  backofficeAuth: backofficeAuthRouter,

  // User management
  user: userRouter,
  userQuiz: userQuizRouter,
  userAnswer: userAnswerRouter,

  // Game system
  level: levelRouter,
  event: eventRouter,
  goal: goalRouter,
  levelGoal: levelGoalRouter,
  levelEvent: levelEventRouter,
  gameInstance: gameInstanceRouter,
  gameUser: gameUserRouter,

  // Trading system
  market: marketRouter,
  submarket: submarketRouter,
  field: fieldRouter,
  asset: assetRouter,
  assetHistory: assetHistoryRouter,
  eventAsset: eventAssetRouter,
  impact: impactRouter,

  // Quiz system
  quiz: quizRouter,
  question: questionRouter,
  quizQuestion: quizQuestionRouter,
  answer: answerRouter,

  // Wallet system
  wallet: walletRouter,
  transaction: transactionRouter,

  // Notification system
  notification: notificationRouter,

  // Dictionary system
  dicoEntry: dicoEntryRouter,

  // Health check
  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })),
});

export type AppRouter = typeof trpcRouter;

# Cashou Backend API Documentation

## Overview

The Cashou backend is built with **Bun** and uses **tRPC** for type-safe API calls. Authentication is handled via **better-auth**.

- **Base URL**: `http://localhost:3000`
- **tRPC Endpoint**: `/api/trpc/*`
- **Auth Endpoint**: `/api/auth/*`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Management](#2-user-management)
3. [Game System](#3-game-system)
4. [Trading System](#4-trading-system)
5. [Quiz System](#5-quiz-system)
6. [Wallet & Transactions](#6-wallet--transactions)
7. [Notifications](#7-notifications)
8. [Dictionary](#8-dictionary)
9. [Health Check](#9-health-check)

---

## 1. Authentication

### Auth Router (`auth.*`)

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| `auth.register` | mutation | ❌ | Register a new user |
| `auth.login` | mutation | ❌ | Login with email/password |
| `auth.logout` | mutation | ✅ | Logout current user |
| `auth.me` | query | ✅ | Get current user with session |
| `auth.forgotPassword` | mutation | ❌ | Request password reset email |
| `auth.resetPassword` | mutation | ❌ | Reset password with token |
| `auth.getHomeData` | query | ✅ | Get home screen data (user + game info + level completion) |
| `auth.getPendingEvent` | query | ✅ | Get pending event requiring user action |

#### `auth.register`
```typescript
input: {
  email: string,      // Valid email
  password: string,   // Min 8 characters
  name?: string
}
output: { success: boolean, user: User, token: string }
```

#### `auth.login`
```typescript
input: {
  email: string,
  password: string
}
output: { success: boolean, user: User, token: string }
```

#### `auth.me`
```typescript
output: {
  user: {
    id, email, name, image, createdAt, updatedAt,
    emailVerified, username, discriminator, lastActivity,
    levelId, badges, points, currentStreak, maxStreak
  },
  session: Session
}
```

#### `auth.getHomeData`
```typescript
output: {
  user: { id, name, username, email, points, currentStreak, maxStreak },
  level: { id, number, title, description, startBalance },
  activeGame: { id, isPaused, actionRequired, levelNumber, levelTitle, progression, currentReturn } | null,
  lastCompletedGame: {
    id, levelId, levelNumber, levelTitle, endedAt,
    stars, mandatoryGoalsMet, bonusGoalsMet, quizPassed
  } | null
}
```

### Backoffice Auth Router (`backofficeAuth.*`)

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| `backofficeAuth.signIn` | mutation | ❌ | Backoffice admin login |
| `backofficeAuth.verify` | query | ❌ | Verify backoffice token |

#### `backofficeAuth.signIn`
```typescript
input: { email: string, password: string }
output: { user: { id, email, name, roles }, token: string }
```

#### `backofficeAuth.verify`
```typescript
input: { token: string }
output: { user: { id, email, name, roles } }
```

---

## 2. User Management

### User Router (`user.*`)

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| `user.getAll` | query | ❌ | Get all users (no pagination) |
| `user.list` | query | 🔐 Admin | Paginated user list with search |
| `user.getById` | query | ✅ | Get user by ID (self or admin) |
| `user.adminGetById` | query | 🔐 Admin | Get any user by ID (admin only) |
| `user.create` | mutation | 🔐 Admin | Create new user |
| `user.update` | mutation | ✅ | Update user (limited for non-admin) |
| `user.delete` | mutation | 🔐 Admin | Delete user |
| `user.updateProfile` | mutation | ✅ | Update own profile |
| `user.updateExpoPushToken` | mutation | ✅ | Update Expo push token for notifications |

#### `user.list`
```typescript
input: {
  limit?: number,    // 1-100, default: 10
  offset?: number,   // default: 0
  search?: string    // Search email/username
}
output: { users: User[], total: number, hasMore: boolean }
```

#### `user.updateProfile`
```typescript
input: {
  username?: string,       // Min 3 chars
  currentPassword?: string,
  newPassword?: string     // Min 8 chars, requires currentPassword
}
```

---

## 3. Game System

### Level Router (`level.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `level.getAll` | query | Get all levels |
| `level.getById` | query | Get level by ID |
| `level.getGoals` | query | Get goals for a level |
| `level.getEvents` | query | Get events for a level |
| `level.getSummary` | query | Full level summary with goals, events, levelGoals (isMandatory) |
| `level.getUserLevels` | query | User progression across levels (stars, points, unlocked) |
| `level.getAvailability` | query | Check if user can unlock level |
| `level.duplicate` | mutation | Duplicate an existing level |
| `level.create` | mutation | Create new level |
| `level.update` | mutation | Update existing level |
| `level.delete` | mutation | Delete level |

#### `level.getUserLevels`
```typescript
input: { userId: string }  // User CUID
output: Array<{ level, stars, points, unlocked, mandatoryGoalsMet?, bonusGoalsMet?, quizPassed? }>
```

### Event Router (`event.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `event.getAll` | query | Get all events |
| `event.getById` | query | Get event by ID |
| `event.create` | mutation | Create event |
| `event.update` | mutation | Update event |
| `event.delete` | mutation | Delete event |

### Goal Router (`goal.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `goal.getAll` | query | Get all goals |
| `goal.getById` | query | Get goal by ID |
| `goal.create` | mutation | Create goal |
| `goal.update` | mutation | Update goal |
| `goal.delete` | mutation | Delete goal |

#### `goal.create`
```typescript
input: {
  title?: string | null,
  description?: string | null,
  successMessage?: string | null,
  failureMessage?: string | null
}
```

#### `goal.update`
```typescript
input: {
  id: number,
  data: {
    title?: string | null,
    description?: string | null,
    successMessage?: string | null,
    failureMessage?: string | null
  }
}
```

### Level-Goal Router (`levelGoal.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `levelGoal.getAll` | query | Get all level-goal links |
| `levelGoal.getById` | query | Get link by ID |
| `levelGoal.getByLevelId` | query | Get goals for a level |
| `levelGoal.getByGoalId` | query | Get levels for a goal |
| `levelGoal.create` | mutation | Link goal to level (levelId, goalId, isMandatory) |
| `levelGoal.update` | mutation | Update link (e.g. isMandatory) |
| `levelGoal.delete` | mutation | Unlink goal from level |

### Level-Event Router (`levelEvent.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `levelEvent.getAll` | query | Get all level-event links |
| `levelEvent.getById` | query | Get link by ID |
| `levelEvent.getByLevelId` | query | Get events for a level |
| `levelEvent.getByEventId` | query | Get levels for an event |
| `levelEvent.create` | mutation | Link event to level |
| `levelEvent.update` | mutation | Update link |
| `levelEvent.delete` | mutation | Unlink event from level |

### Game Instance Router (`gameInstance.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `gameInstance.getAll` | query | Get all game instances |
| `gameInstance.getById` | query | Get instance by ID |
| `gameInstance.create` | mutation | Create new game instance |
| `gameInstance.update` | mutation | Update instance |
| `gameInstance.delete` | mutation | Delete instance |
| `gameInstance.getByUser` | query | Get instances for user |
| `gameInstance.getByLevel` | query | Get instances for level |
| `gameInstance.pause` | mutation | Pause game instance |
| `gameInstance.resume` | mutation | Resume paused instance |
| `gameInstance.start` | mutation | Start game (reset clock) |
| `gameInstance.setActionRequired` | mutation | Set action required flag |
| `gameInstance.endGame` | mutation | End game, validate goals, record level completion (stars) |
| `gameInstance.completeEvent` | mutation | Complete current event, schedule next |
| `gameInstance.getTimeInfo` | query | Get time info for instance |
| `gameInstance.resetLevel` | mutation | Reset level for user (dev) |

#### `gameInstance.endGame`
```typescript
input: { id: number }
output: {
  success: boolean,
  gameInstanceId: number,
  startBalance: number,
  walletBalance: number,
  assetsValue: number,
  totalValue: number,
  goals: Array<{
    id: number,
    title: string,
    description: string | null,
    isMandatory: boolean,
    validated: boolean
  }>,
  message: string,
  modal: {
    type: "PRIMARY_AND_SECONDARY_SUCCESS" | "PRIMARY_SUCCESS_ONLY" | "PRIMARY_FAILURE",
    title: string,
    primaryMessage: string,
    secondaryMessage: string | null
  },
  stars?: number,
  mandatoryGoalsMet?: boolean,
  bonusGoalsMet?: boolean,
  quizPassed?: boolean
}
```

### Game Instance Event Router (`gameInstanceEvent.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `gameInstanceEvent.findByGameInstance` | query | Get events for a game instance |
| `gameInstanceEvent.findDue` | query | Get due events (scheduled) |

### Game User Router (`gameUser.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `gameUser.create` | mutation | Create game user |
| `gameUser.update` | mutation | Update game user |
| `gameUser.findAll` | query | Get all game users |
| `gameUser.findById` | query | Get game user by ID |
| `gameUser.findByUser` | query | Get game users for user |
| `gameUser.findByGameInstance` | query | Get game users for instance |
| `gameUser.findByStatus` | query | Get by status |
| `gameUser.findByCreator` | query | Get by creator |
| `gameUser.updateStatus` | mutation | Update status |
| `gameUser.delete` | mutation | Delete game user |

---

## 4. Trading System

### Market Router (`market.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `market.getAll` | query | Get all markets |
| `market.getById` | query | Get market by ID |
| `market.create` | mutation | Create market |
| `market.update` | mutation | Update market |
| `market.delete` | mutation | Delete market |
| `market.list` | query | Paginated list with counters |
| `market.search` | query | Search by keywords/trends |
| `market.getTree` | query | Hierarchical market structure |
| `market.getOverview` | query | Market overview with KPIs |
| `market.getSnapshot` | query | Real-time market snapshot |
| `market.getHistory` | query | Historical data with date range |
| `market.getHeatmap` | query | Heatmap data (performance/volume/volatility/risk) |

#### `market.search`
```typescript
input: {
  query?: string,
  tag?: string,
  trend?: string
}
```

#### `market.getHistory`
```typescript
input: {
  marketId: number,
  from: string,  // Date ISO
  to: string     // Date ISO
}
```

#### `market.getHeatmap`
```typescript
input: {
  marketId: number,
  metric: 'performance' | 'volume' | 'volatility' | 'risk'
}
```

### Submarket Router (`submarket.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `submarket.getAll` | query | Get all submarkets |
| `submarket.getById` | query | Get submarket by ID |
| `submarket.getByMarketId` | query | Get submarkets for a market |
| `submarket.create` | mutation | Create submarket |
| `submarket.update` | mutation | Update submarket |
| `submarket.delete` | mutation | Delete submarket |

### Field Router (`field.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `field.getAll` | query | Get all fields |
| `field.getById` | query | Get field by ID |
| `field.getByMarketId` | query | Get fields for a market |
| `field.create` | mutation | Create field |
| `field.update` | mutation | Update field |
| `field.delete` | mutation | Delete field |

### Asset Router (`asset.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `asset.getAll` | query | Get all assets |
| `asset.getById` | query | Get asset by ID |
| `asset.getByMarketId` | query | Get assets for a market |
| `asset.getBySubmarketId` | query | Get assets for a submarket |
| `asset.create` | mutation | Create asset |
| `asset.update` | mutation | Update asset |
| `asset.delete` | mutation | Delete asset |

### Asset History Router (`assetHistory.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `assetHistory.getAll` | query | Get all asset histories |
| `assetHistory.getById` | query | Get by ID |
| `assetHistory.getByAssetId` | query | Get history for asset |
| `assetHistory.getByAssetIdAndPeriod` | query | Get by asset and period |
| `assetHistory.getLatestByAssetId` | query | Get latest for asset |
| `assetHistory.create` | mutation | Create asset history |
| `assetHistory.update` | mutation | Update asset history |
| `assetHistory.delete` | mutation | Delete asset history |

### Event Asset Router (`eventAsset.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `eventAsset.getAll` | query | Get all event-asset links |
| `eventAsset.getById` | query | Get by ID |
| `eventAsset.getByAssetId` | query | Get events for asset |
| `eventAsset.getByEventId` | query | Get assets for event |
| `eventAsset.getByPeriod` | query | Get by period |
| `eventAsset.create` | mutation | Link event to asset |
| `eventAsset.update` | mutation | Update link |
| `eventAsset.delete` | mutation | Unlink event from asset |

### Impact Router (`impact.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `impact.getAll` | query | Get all impacts |
| `impact.getById` | query | Get impact by ID |
| `impact.getByEventId` | query | Get impacts for an event |
| `impact.getByFieldId` | query | Get impacts for a field |
| `impact.getBySubmarketId` | query | Get impacts for a submarket |
| `impact.getByAssetId` | query | Get impacts for an asset |
| `impact.getByMinCoefficient` | query | Filter by minimum coefficient |
| `impact.create` | mutation | Create impact |
| `impact.update` | mutation | Update impact |
| `impact.delete` | mutation | Delete impact |

---

## 5. Quiz System

### Quiz Router (`quiz.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `quiz.getAll` | query | Get all quizzes |
| `quiz.getById` | query | Get quiz by ID |
| `quiz.create` | mutation | Create quiz |
| `quiz.update` | mutation | Update quiz |
| `quiz.delete` | mutation | Delete quiz |
| `quiz.getByLevel` | query | Get quizzes for a level |
| `quiz.getByType` | query | Get quizzes by type (DAILY/MCQ) |
| `quiz.getTodaysDailyQuiz` | query | Get today's daily quiz |
| `quiz.dailyQuizExists` | query | Check if daily quiz exists for date |
| `quiz.getDailyHistory` | query | Get daily quiz history |

### Question Router (`question.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `question.getAll` | query | Get all questions |
| `question.getById` | query | Get question by ID |
| `question.create` | mutation | Create question |
| `question.update` | mutation | Update question |
| `question.delete` | mutation | Delete question |
| `question.search` | query | Search questions by keyword |

### Quiz Question Router (`quizQuestion.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `quizQuestion.getAll` | query | Get all quiz-question links |
| `quizQuestion.getById` | query | Get by ID |
| `quizQuestion.getByQuiz` | query | Get questions for quiz |
| `quizQuestion.getByQuestion` | query | Get quizzes for question |
| `quizQuestion.getQuestionsWithAnswers` | query | Get questions with answers for quiz |
| `quizQuestion.create` | mutation | Add question to quiz |
| `quizQuestion.update` | mutation | Update link |
| `quizQuestion.delete` | mutation | Remove question from quiz |
| `quizQuestion.shuffleQuizOrder` | mutation | Shuffle question order |
| `quizQuestion.searchInQuiz` | query | Search keyword in quiz |
| `quizQuestion.validateQuizStructure` | query | Validate quiz structure |
| `quizQuestion.getRandomQuestions` | query | Get random questions for quiz |

### Answer Router (`answer.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `answer.getAll` | query | Get all answers |
| `answer.getById` | query | Get answer by ID |
| `answer.create` | mutation | Create answer |
| `answer.update` | mutation | Update answer |
| `answer.delete` | mutation | Delete answer |
| `answer.getByQuestion` | query | Get answers for a question |

### User Quiz Router (`userQuiz.*`)

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| `userQuiz.getAll` | query | ❌ | Get all quiz participations |
| `userQuiz.getById` | query | ❌ | Get participation by ID |
| `userQuiz.create` | mutation | ❌ | Create participation |
| `userQuiz.update` | mutation | ❌ | Update participation |
| `userQuiz.delete` | mutation | ❌ | Delete participation |
| `userQuiz.getByUser` | query | ❌ | Get participations for user |
| `userQuiz.getByQuiz` | query | ❌ | Get participations for quiz |
| `userQuiz.startQuiz` | mutation | ❌ | Start a quiz |
| `userQuiz.completeQuiz` | mutation | ❌ | Complete quiz with result |
| `userQuiz.hasParticipated` | query | ❌ | Check if user participated |
| `userQuiz.getUserStats` | query | ❌ | Get user quiz statistics |
| `userQuiz.getQuizStats` | query | ❌ | Get quiz statistics |
| `userQuiz.getStatus` | query | ❌ | Get user status on quiz |
| `userQuiz.getInProgressByUser` | query | ❌ | Get in-progress quizzes |
| `userQuiz.abandonQuiz` | mutation | ❌ | Abandon quiz in progress |
| `userQuiz.resumeQuiz` | query | ❌ | Resume interrupted quiz |
| `userQuiz.getHistoryByUser` | query | ❌ | Paginated quiz history |
| `userQuiz.getElapsedTime` | query | ❌ | Get elapsed time for quiz |
| `userQuiz.getUserDetailedStats` | query | ❌ | Detailed stats with period |
| `userQuiz.getLeaderboard` | query | ❌ | Get user leaderboard |
| `userQuiz.getStatsByType` | query | ❌ | Stats by quiz type |
| `userQuiz.getStreaks` | query | ❌ | Get success streaks |
| `userQuiz.hasDoneDailyToday` | query | ❌ | Check daily quiz status |
| `userQuiz.getDailyHistory` | query | ❌ | Daily quiz history |
| `userQuiz.getDailyStreak` | query | ❌ | Consecutive daily quiz streak |
| `userQuiz.hasDoneDailyTodayForCurrentUser` | query | ✅ | Check daily for current user |
| `userQuiz.createOrUpdateParticipation` | mutation | ✅ | Create/update participation |

### User Answer Router (`userAnswer.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `userAnswer.getAll` | query | Get all user answers |
| `userAnswer.getById` | query | Get answer by ID |
| `userAnswer.create` | mutation | Create user answer |
| `userAnswer.update` | mutation | Update user answer |
| `userAnswer.delete` | mutation | Delete user answer |
| `userAnswer.getByUser` | query | Get answers for user |
| `userAnswer.getByQuestion` | query | Get answers for question |
| `userAnswer.getByAnswer` | query | Get occurrences of answer |
| `userAnswer.getByAccuracy` | query | Filter by accuracy |
| `userAnswer.submitAnswer` | mutation | Submit answer (with validation) |
| `userAnswer.getByUserAndQuestion` | query | Get user's answer to question |
| `userAnswer.hasAnswered` | query | Check if user answered |
| `userAnswer.getUserStats` | query | Get user answer stats |
| `userAnswer.getQuestionStats` | query | Get question stats |
| `userAnswer.getAnswerStats` | query | Get answer stats |

---

## 6. Wallet & Transactions

### Wallet Router (`wallet.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `wallet.getAll` | query | Get all wallets |
| `wallet.getById` | query | Get wallet by ID |
| `wallet.create` | mutation | Create wallet |
| `wallet.update` | mutation | Update wallet |
| `wallet.delete` | mutation | Delete wallet |
| `wallet.getByUser` | query | Get wallets for user |
| `wallet.getByGameInstance` | query | Get wallets for game instance |
| `wallet.updateAmount` | mutation | Set wallet amount |
| `wallet.addAmount` | mutation | Add to wallet amount |

### Transaction Router (`transaction.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `transaction.getAll` | query | Get all transactions |
| `transaction.getById` | query | Get transaction by ID |
| `transaction.create` | mutation | Create transaction |
| `transaction.update` | mutation | Update transaction |
| `transaction.delete` | mutation | Delete transaction |
| `transaction.getByWallet` | query | Get transactions for wallet |
| `transaction.getByAsset` | query | Get transactions for asset |
| `transaction.getByType` | query | Get transactions by type (BUY/SELL) |
| `transaction.getTotalValueByWallet` | query | Calculate wallet total value |

### Holding Router (`holding.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `holding.getAll` | query | Get all holdings |
| `holding.getById` | query | Get holding by ID |
| `holding.getByWalletAndAsset` | query | Get holding by wallet + asset |
| `holding.getByWallet` | query | Get holdings for wallet |
| `holding.getByGameInstance` | query | Get holdings for game instance |
| `holding.getByAsset` | query | Get holdings for asset |
| `holding.create` | mutation | Create holding |
| `holding.update` | mutation | Update holding |
| `holding.updateQuantity` | mutation | Set quantity |
| `holding.addQuantity` | mutation | Add to quantity |
| `holding.subtractQuantity` | mutation | Subtract from quantity |
| `holding.delete` | mutation | Delete holding |

### Investment Router (`investment.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `investment.buy` | mutation | Buy asset (deposit/order) |
| `investment.sell` | mutation | Sell asset (withdraw/sell, interests applied) |
| `investment.getPortfolio` | query | Get portfolio with interests (walletId, gameInstanceId) |
| `investment.getHoldingWithInterests` | query | Get single holding with interests |
| `investment.applyInterests` | mutation | Apply interests to all holdings of a game instance |

#### `investment.buy` / `investment.sell`
```typescript
input: { walletId: number, assetId: number, amount: number, gameInstanceId: number }
```

#### `investment.getPortfolio`
```typescript
input: { walletId: number, gameInstanceId: number }
```

#### `investment.getHoldingWithInterests`
```typescript
input: { holdingId: number, gameInstanceId: number }
```

---

## 7. Notifications

### Notification Router (`notification.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `notification.getAll` | query | Get all notifications |
| `notification.getById` | query | Get notification by ID |
| `notification.findByUser` | query | Get notifications for user |
| `notification.create` | mutation | Create notification |
| `notification.update` | mutation | Update notification |
| `notification.markedAsRead` | mutation | Mark single notification read |
| `notification.markAllAsRead` | mutation | Mark all user notifications read |
| `notification.delete` | mutation | Delete notification |

---

## 8. Dictionary

### Dico Entry Router (`dicoEntry.*`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `dicoEntry.getAll` | query | Get all dictionary entries |
| `dicoEntry.getAllPaginated` | query | Get entries with pagination |
| `dicoEntry.getById` | query | Get entry by ID |
| `dicoEntry.getByTerm` | query | Get entry by exact term |
| `dicoEntry.search` | query | Search by term or definition |
| `dicoEntry.create` | mutation | Create entry |
| `dicoEntry.createMany` | mutation | Create multiple entries |
| `dicoEntry.update` | mutation | Update entry |
| `dicoEntry.delete` | mutation | Delete entry |
| `dicoEntry.count` | query | Count total entries |

---

## 9. Health Check

| Endpoint | Type | Description |
|----------|------|-------------|
| `health` | query | tRPC health check (no input) |

```typescript
output: {
  status: 'ok',
  timestamp: string  // ISO date
}
```

---

## Authentication Legend

| Symbol | Meaning |
|--------|---------|
| ❌ | Public - no authentication required |
| ✅ | Protected - requires valid session |
| 🔐 Admin | Admin only - requires admin role |

---

## Error Handling

All endpoints return tRPC errors with standard codes:

| Code | Description |
|------|-------------|
| `BAD_REQUEST` | Invalid input data |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Duplicate resource |
| `INTERNAL_SERVER_ERROR` | Server error |

---

## Usage Examples

### tRPC Client (TypeScript)
```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@cashou/backend';

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
});

// Login
const { token, user } = await trpc.auth.login.mutate({
  email: 'user@example.com',
  password: 'password123'
});

// Get levels
const levels = await trpc.level.getAll.query();

// Start a quiz
const participation = await trpc.userQuiz.startQuiz.mutate({
  quizId: 1,
  userId: 1
});
```

### HTTP Requests
```http
# Health check (tRPC)
GET http://localhost:3000/api/trpc/health

# Get all levels
GET http://localhost:3000/api/trpc/level.getAll

# Get level by ID
GET http://localhost:3000/api/trpc/level.getById?input={"id":1}

# Login
POST http://localhost:3000/api/trpc/auth.login
Content-Type: application/json

{"email":"user@example.com","password":"password123"}
```

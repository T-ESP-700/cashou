# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Bun-based backend API for the Cashou application, a gamified financial education platform. The project uses TypeScript, Prisma ORM with PostgreSQL, and Better-Auth for authentication.

## Development Commands

### Core Development
- `bun dev` - Start development server with hot reload on port 3000
- `bun start` - Run production server
- `bun run build` - TypeScript type checking (no emit)
- `bun run check` - Alternative TypeScript type checking

### Database Management
- `bun run generate` - Generate Prisma client
- `bun run migrate` - Run database migrations in development
- `bun run migrate:deploy` - Deploy migrations to production
- `bun run migrate:reset` - Reset database and re-run migrations
- `bun run studio` - Open Prisma Studio for database inspection
- `bun run db:check` - Pull database schema from remote
- `bun run db:status` - Check database connection status (scripts/db-check.ts)
- `bun run db:seed` - Seed database with initial data (src/seed-data.ts)
- `bun run db:empty` - Force reset database (destructive)

### Testing
- `bun test` - Run tests using Bun's built-in test runner

## Architecture

### Tech Stack
- **Runtime**: Bun 1.0+
- **Language**: TypeScript with strict mode
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better-Auth with Prisma adapter
- **Package Manager**: Bun

### Database Schema
The application uses two Prisma schemas:
- **app/schema.prisma**: Main application schema with extensive models for the gamified trading simulation
- **backoffice/schema.prisma**: Separate schema for administrative functions

Key domain models include:
- **User/Authentication**: User profiles with level progression and points system
- **Game System**: Levels, Goals, Events, GameInstances for simulation management
- **Trading**: Assets, Markets, Submarkets, Transactions, Wallets for financial simulation
- **Education**: Quiz system with Questions, Answers, and user progress tracking
- **Notifications**: User notification system with different notification types

### Project Structure
```
backend/
├── prisma/
│   ├── app/           # Main application database schema
│   └── backoffice/    # Admin database schema
├── src/
│   ├── controllers/   # Request handlers (currently empty)
│   ├── lib/          # Shared utilities (auth.ts)
│   ├── middleware/   # Express/Bun middleware (currently empty)
│   ├── routes/       # API routes (currently empty)
│   ├── services/     # Business logic (currently empty)
│   ├── types/        # TypeScript type definitions
│   ├── database.ts   # Prisma client singleton
│   ├── index.ts      # Main server entry point
│   └── seed-data.ts  # Database seeding script
├── scripts/
│   └── db-check.ts   # Database connection verification
└── tests/            # Test files

```

### Current Implementation Status
The project is in early development with:
- Basic Bun server setup with health check endpoint
- Prisma configuration for database management
- Better-Auth integration for authentication (in progress)
- Empty directory structure for MVC pattern implementation

### Environment Variables
Required environment variables:
- `CASHOU_DB_URL` - PostgreSQL connection string for main database
- Additional auth-related environment variables for Better-Auth configuration

## TypeScript Configuration
- Target: ESNext with bundler module resolution
- Strict mode enabled
- Import extensions allowed for Bun compatibility
- No emit mode (Bun handles transpilation)

---

## Mobile App Architecture (apps/mobile)

### Tech Stack
- **Framework**: React Native with Expo
- **Routing**: Expo Router (file-based)
- **State Management**: React Query + tRPC
- **Styling**: NativeWind (Tailwind for RN)

### Data Fetching with @trpc/react-query

The mobile app uses **@trpc/react-query** for type-safe API calls with automatic caching, retry, and background refetching.

#### Provider Setup (app/_layout.tsx)
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTRPCClientForProvider } from '@/lib/trpc';

// QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 min - data considered fresh
      gcTime: 1000 * 60 * 30,       // 30 min - cache retention
      retry: 2,                      // Retry failed requests
      refetchOnWindowFocus: false,   // Mobile: no window focus
      refetchOnReconnect: true,      // Refetch on network reconnect
    },
  },
});

// Provider hierarchy (order matters!)
<trpc.Provider client={trpcClient} queryClient={queryClient}>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      {/* ... */}
    </AuthProvider>
  </QueryClientProvider>
</trpc.Provider>
```

### How to Make API Calls

#### 1. Queries (GET data) - Use `useQuery`

```typescript
import { trpc } from '@/lib/trpc';

// Basic query
const { data, isLoading, error, refetch } = trpc.auth.getHomeData.useQuery();

// Query with parameters
const { data: quiz } = trpc.quiz.getById.useQuery(
  { id: quizId },
  { enabled: !!quizId }  // Only run when quizId exists
);

// Query with custom options
const { data: holdings } = trpc.holding.getByGameInstance.useQuery(
  { gameInstanceId },
  {
    enabled: gameInstanceId !== null,
    staleTime: 1000 * 60,  // Override default staleTime
    refetchInterval: 5000, // Poll every 5 seconds (for real-time data)
  }
);
```

#### 2. Mutations (POST/PUT/DELETE) - Use `useMutation`

```typescript
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Basic mutation
const submitAnswer = trpc.userAnswer.submitAnswer.useMutation({
  onSuccess: () => {
    // Invalidate related queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: [['userAnswer']] });
  },
  onError: (error) => {
    Alert.alert('Erreur', error.message);
  },
});

// Using the mutation
await submitAnswer.mutateAsync({
  userId: user.id,
  questionId: 123,
  answerId: 456,
});
```

#### 3. Optimistic Updates (for better UX)

```typescript
const submitAnswer = trpc.userAnswer.submitAnswer.useMutation({
  onMutate: async (newAnswer) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['userAnswer'] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['userAnswer']);

    // Optimistically update
    queryClient.setQueryData(['userAnswer'], (old) => [...old, newAnswer]);

    return { previous };
  },
  onError: (err, newAnswer, context) => {
    // Rollback on error
    queryClient.setQueryData(['userAnswer'], context.previous);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['userAnswer'] });
  },
});
```

### When to Use Vanilla Client vs React Query Hooks

| Use Case | Solution |
|----------|----------|
| Data fetching in components | `trpc.router.procedure.useQuery()` |
| Data mutation in components | `trpc.router.procedure.useMutation()` |
| Outside React (notification handlers) | `trpcClient.router.procedure.query()` |
| In useEffect callbacks | `trpcClient` (vanilla) |
| Background tasks | `trpcClient` (vanilla) |

```typescript
// Vanilla client for non-React contexts
import { trpcClient } from '@/lib/trpc';

// In notification handler (outside React)
const result = await trpcClient.auth.getPendingEvent.query();

// In mutation onSuccess callback
await trpcClient.user.updateExpoPushToken.mutate({ token });
```

### Available Game Hooks (hooks/use-game.tsx)

Pre-built hooks for common game operations:

```typescript
import {
  useGameInstance,      // Get game instance by ID
  useGameHoldings,      // Get holdings for a game
  useGameWallet,        // Get wallet by ID
  useLevelSummary,      // Get level with goals
  usePauseGame,         // Mutation: pause game
  useResumeGame,        // Mutation: resume game
  useStartGame,         // Mutation: start game
  useEndGame,           // Mutation: end game
  useCreateGameInstance,// Mutation: create new game
  useCreateWallet,      // Mutation: create wallet
  useResetLevel,        // Mutation: reset level progress
} from '@/hooks/use-game';

// Usage
const { data: gameInstance, isLoading } = useGameInstance(gameId);
const startGame = useStartGame();
await startGame.mutateAsync({ id: gameId });
```

### Refreshing Data

```typescript
// Manual refetch
const { refetch } = trpc.auth.getHomeData.useQuery();
await refetch();

// On screen focus (Expo Router)
useFocusEffect(
  React.useCallback(() => {
    refetchHomeData();
    refetchDailyQuiz();
  }, [])
);

// Invalidate cache (forces refetch on next access)
queryClient.invalidateQueries({ queryKey: [['auth', 'getHomeData']] });

// Clear all cache (on logout)
queryClient.clear();
```

### Best Practices

1. **Always use `enabled` for conditional queries**
   ```typescript
   // Good
   trpc.quiz.getById.useQuery({ id }, { enabled: !!id });

   // Bad - will error if id is null
   trpc.quiz.getById.useQuery({ id: id! });
   ```

2. **Invalidate related queries after mutations**
   ```typescript
   const mutation = trpc.userQuiz.complete.useMutation({
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: [['userQuiz']] });
       queryClient.invalidateQueries({ queryKey: [['auth', 'getHomeData']] });
     },
   });
   ```

3. **Use appropriate staleTime based on data freshness needs**
   - User data: 5 minutes (default)
   - Game state: 30 seconds (changes frequently)
   - Level/Quiz content: 10 minutes (rarely changes)

4. **Handle loading and error states**
   ```typescript
   const { data, isLoading, error } = trpc.quiz.getById.useQuery({ id });

   if (isLoading) return <ActivityIndicator />;
   if (error) return <Text>Error: {error.message}</Text>;
   return <QuizContent data={data} />;
   ```

5. **Avoid fetching in useEffect - use useQuery instead**
   ```typescript
   // Bad
   useEffect(() => {
     trpcClient.quiz.getById.query({ id }).then(setData);
   }, [id]);

   // Good
   const { data } = trpc.quiz.getById.useQuery({ id });
   ```

### File Structure

```
apps/mobile/
├── lib/
│   └── trpc.ts              # tRPC client setup (React + vanilla)
├── hooks/
│   ├── use-auth.tsx         # Auth context with React Query
│   ├── use-game.tsx         # Game-related hooks
│   └── use-notifications.tsx # Push notification hooks
├── app/
│   ├── _layout.tsx          # Providers (QueryClient, tRPC)
│   ├── (tabs)/
│   │   ├── index.tsx        # Home (uses useQuery)
│   │   └── daily-quiz.tsx   # Quiz (uses useQuery + useMutation)
│   └── game/
│       └── current.tsx      # Game screen (uses game hooks)
```
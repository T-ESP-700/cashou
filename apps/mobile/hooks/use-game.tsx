import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { trpcClient } from '@/lib/trpc';
import { CacheInvalidation } from '@/lib/cache-utils';

interface Wallet {
  id: number;
  amount: number;
}

interface Asset {
  id: number;
  title: string | null;
  symbol: string | null;
  rate: number | null;
  taux: number | null;
}

interface Holding {
  id: number;
  quantity: number;
  asset: Asset | null;
}

interface GameInstance {
  id: number;
  isPaused: boolean;
  isEnded: boolean;
  createdAt: string;
  totalPausedDuration: number;
  pausedAt: string | null;
  level: {
    id: number;
    title: string | null;
    number: number | null;
    duration: number | null;
    speed: number | null;
    startBalance: number | null;
  } | null;
}

interface GameContextType {
  // Current game instance ID (set when navigating to game)
  gameInstanceId: number | null;
  setGameInstanceId: (id: number | null) => void;

  // Game instance data (from React Query)
  gameInstance: GameInstance | null;
  isLoadingGameInstance: boolean;

  // Wallet data
  wallet: Wallet | null;
  walletId: number | null;
  setWalletId: (id: number | null) => void;
  isLoadingWallet: boolean;

  // Holdings data
  holdings: Holding[];
  isLoadingHoldings: boolean;

  // Actions
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;
  refetchGame: () => Promise<void>;
  refetchWallet: () => Promise<void>;
  refetchHoldings: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// Separate hook for game data that can be used independently
export function useGameInstance(gameInstanceId: number | null) {
  return trpc.gameInstance.getById.useQuery(
    { id: gameInstanceId! },
    {
      enabled: gameInstanceId !== null,
      staleTime: 1000 * 30, // 30 seconds - game state can change frequently
    }
  );
}

export function useGameHoldings(gameInstanceId: number | null) {
  return trpc.holding.getByGameInstance.useQuery(
    { gameInstanceId: gameInstanceId! },
    {
      enabled: gameInstanceId !== null,
      staleTime: 1000 * 60, // 1 minute
    }
  );
}

export function useGameWallet(walletId: number | null) {
  return trpc.wallet.getById.useQuery(
    { id: walletId! },
    {
      enabled: walletId !== null,
      staleTime: 1000 * 30, // 30 seconds
    }
  );
}

// Mutations
export function usePauseGame() {
  const queryClient = useQueryClient();

  return trpc.gameInstance.pause.useMutation({
    onSuccess: () => {
      // Invalidate all game instance queries to refetch latest state
      queryClient.invalidateQueries({
        queryKey: [['gameInstance']],
      });
    },
  });
}

export function useResumeGame() {
  const queryClient = useQueryClient();

  return trpc.gameInstance.resume.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [['gameInstance']],
      });
    },
  });
}

export function useStartGame() {
  const queryClient = useQueryClient();

  return trpc.gameInstance.start.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [['gameInstance']],
      });
    },
  });
}

export function useEndGame() {
  const queryClient = useQueryClient();

  return trpc.gameInstance.endGame.useMutation({
    onSuccess: () => {
      // Use centralized invalidation for consistent cache management
      CacheInvalidation.gameEnded(queryClient);
    },
  });
}

export function useCreateGameInstance() {
  const queryClient = useQueryClient();

  return trpc.gameInstance.create.useMutation({
    onSuccess: () => {
      // Invalidate home data since a new game was created
      queryClient.invalidateQueries({
        queryKey: [['auth', 'getHomeData']],
      });
    },
  });
}

export function useResetLevel() {
  const queryClient = useQueryClient();

  return trpc.gameInstance.resetLevel.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [['auth', 'getHomeData']],
      });
    },
  });
}

// Wallet mutations
export function useCreateWallet() {
  return trpc.wallet.create.useMutation();
}

// Investment mutations (buy/sell assets)
export function useBuyInvestment() {
  const queryClient = useQueryClient();

  return trpc.investment.buy.useMutation({
    onSuccess: () => {
      CacheInvalidation.investmentChanged(queryClient);
    },
  });
}

export function useSellInvestment() {
  const queryClient = useQueryClient();

  return trpc.investment.sell.useMutation({
    onSuccess: () => {
      CacheInvalidation.investmentChanged(queryClient);
    },
  });
}

// Level queries
export function useLevelSummary(levelId: number | null) {
  return trpc.level.getSummary.useQuery(
    { id: levelId! },
    {
      enabled: levelId !== null,
      staleTime: 1000 * 60 * 10, // 10 minutes - level data doesn't change often
    }
  );
}

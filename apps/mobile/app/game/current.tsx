import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CashouTheme } from '@/constants/cashou-theme';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAlert } from '@/hooks/use-alert';
import { trpcClient } from '@/lib/trpc';
import { cachedQuery, invalidateCache } from '../../lib/query-cache';
import { useGameRealtime } from '@/hooks/use-game-realtime';
import { useAuth } from '@/hooks/use-auth';
import { useHeader, useGameHeaderSubtitle } from '@/hooks/use-header';
import { useNotifications } from '@/hooks/use-notifications';
import { LevelInfoModal } from '@/components/level-info-modal';
import { ActionPillButton, GoalStarIcon } from '@/components/ui';
import { Level1TourOverlay } from '@/components/level1-tour-overlay';
import { Level1TourCallout } from '@/components/level1-tour-callout';
import { useLevel1Tour } from '@/contexts/level1-tour-context';
import {
  Level1TourStep,
  tourBubbleForStep,
  tourStepHeadline,
  isLivretAAsset,
  isSavingsLivretOtherThanA,
} from '@/constants/level1-tour';
import QuizActionIcon from '@/assets/images/quiz-action.svg';
import RecapActionIcon from '@/assets/images/recap-action.svg';

interface GameStats {
  level: number;
  cash: number;
  timePassed: string;
  successes: number;
}

interface AssetData {
  id: number;
  title: string | null;
  symbol: string | null;
  rate: number | null;
  description: string | null;
  submarket?: { type?: string | null; title?: string | null } | null;
}

interface HoldingData {
  id: number;
  quantity: string | number | null;
  asset: AssetData | null;
}

interface GoalData {
  id: number;
  title: string | null;
  description: string | null;
  isMandatory?: boolean;
}

interface LevelGoalData {
  goalId: number;
  isMandatory: boolean;
  goal: { id: number; title: string | null; description: string | null };
}

interface LevelData {
  level: {
    id: number;
    title: string | null;
    number: number | null;
    description: string | null;
    startBalance: number | null;
    duration: number | null;
    speed: number | null;
  } | null;
  goals?: GoalData[];
  levelGoals?: LevelGoalData[];
}

interface GameTimeState {
  createdAt: Date;
  totalPausedDuration: number; // en secondes
  duration: number; // jours de jeu
  speed: number; // multiplicateur
  isEnded: boolean; // partie terminée
  isPaused: boolean; // partie en pause
  pausedAt: Date | null; // date de début de pause actuelle
}

type EndGameModalType =
  | 'PRIMARY_AND_SECONDARY_SUCCESS'
  | 'PRIMARY_SUCCESS_ONLY'
  | 'PRIMARY_FAILURE';

interface EndGameModalContent {
  type: EndGameModalType;
  title: string;
  primaryMessage: string;
  secondaryMessage: string | null;
  tip: string | null;
}

interface EndGameGoalResult {
  id: number;
  title: string;
  description: string | null;
  isMandatory: boolean;
  validated: boolean;
}

interface EndGameResult {
  success: boolean;
  gameInstanceId: number;
  goals: EndGameGoalResult[];
  message: string;
  modal?: EndGameModalContent;
}

// Constantes pour l'animation de la date
// Use today's date as the starting point for the in-game calendar
const today = new Date();
const GAME_START_DATE = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const UPDATE_INTERVAL_MS = 1000;
const PORTFOLIO_REFRESH_INTERVAL_MS = 3_000;

// Constantes pour l'animation visuelle de la date
const DAY_ANIMATION_MS = 30; // Vitesse par jour (30ms = très rapide)
const MONTH_PAUSE_MS = 150; // Pause supplémentaire au changement de mois

export default function GameCurrentScreen() {
  const { levelId, gameId } = useLocalSearchParams<{ levelId: string; gameId?: string }>();
  const { colors: theme, isDark } = useCashouTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { pendingEventCompletion, setPendingEventCompletion, isOnAssetsScreen, setActiveGameInstanceId, eventNotification, triggerPendingEventCheck, requestedAssetsSheetGameId, setRequestedAssetsSheetGameId } = useNotifications();
  const tour = useLevel1Tour();
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const level1TourInitSeqRef = useRef(0);
  const { setOptions: setHeaderOptions } = useHeader();
  const { state: realtimeState, setGameInstanceId: setRealtimeGameInstanceId, formattedGameDate } = useGameRealtime();

  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameInstanceId, setGameInstanceId] = useState<number | null>(gameId ? parseInt(gameId, 10) : null);
  const [walletId, setWalletId] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(true); // Game starts paused until user clicks "Démarrer"
  const [isStarting, setIsStarting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [holdings, setHoldings] = useState<HoldingData[]>([]);
  const [holdingValues, setHoldingValues] = useState<Record<number, number>>({});
  const [holdingDeposited, setHoldingDeposited] = useState<Record<number, number>>({});
  const [holdingWithdrawn, setHoldingWithdrawn] = useState<Record<number, number>>({});
  const [showNoInvestmentModal, setShowNoInvestmentModal] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [endGameResult, setEndGameResult] = useState<EndGameResult | null>(null);
  const [levelQuizId, setLevelQuizId] = useState<number | null>(null);
  const [isReplayCreating, setIsReplayCreating] = useState(false);
  const [showLevelInfoModal, setShowLevelInfoModal] = useState(false);
  const hasShownLevelInfoRef = useRef(false);

  // Impact coefficients: assetId → cumulated coef (frontend-only rate adjustment)
  const [impactCoefs, setImpactCoefs] = useState<Record<number, number>>({});

  // Assets bottom sheet state
  const assetsSheetRef = useRef<BottomSheetModal>(null);
  const [bottomChromeHeight, setBottomChromeHeight] = useState(() =>
    Math.round(96 + insets.bottom),
  );
  const prevPendingEventRef = useRef(false);
  const skipResumeOnCloseRef = useRef(false); // Don't resume game when closing sheet to navigate to asset-detail
  const navigatedToAssetDetailRef = useRef(false); // Track if we navigated away to asset-detail
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsSearchQuery, setAssetsSearchQuery] = useState('');
  const [selectedSubmarketId, setSelectedSubmarketId] = useState<number | null>(null);
  const [isAssetsSheetOpen, setIsAssetsSheetOpen] = useState(false); // Track sheet visibility to freeze animations

  const [gameDate, setGameDate] = useState(GAME_START_DATE);
  const [gameTimeState, setGameTimeState] = useState<GameTimeState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false); // Animation en cours
  const [targetDate, setTargetDate] = useState<Date | null>(null); // Date cible pour l'animation
  const [isGameEnded, setIsGameEnded] = useState(false); // Partie terminée
  const [gameHasBeenStarted, setGameHasBeenStarted] = useState(false); // Le jeu a été démarré au moins une fois via start()
  const isAwaitingEventResume = pendingEventCompletion === gameInstanceId;

  // Game has started if start() was called at least once (not just created in preparation mode)
  const hasGameStarted = gameInstanceId !== null && gameHasBeenStarted;

  // Game is in preparation mode (instance created but not yet started via "Démarrer")
  const isInPreparation = gameInstanceId !== null && !gameHasBeenStarted && !isGameEnded;

  // Stats simulées pour la démo (à remplacer par de vraies données)
  const [stats, setStats] = useState<GameStats>({
    level: 0, // 0 = not yet loaded, avoids "Niveau 1" → "Niveau N" flicker
    cash: 1000,
    timePassed: '0m',
    successes: 0,
  });

  const tourFocusedPillStyle = useMemo(
    () =>
      Platform.OS === 'android'
        ? { borderWidth: 3, borderColor: '#FFFFFF', elevation: 20 }
        : {
            borderWidth: 3,
            borderColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
          },
    [],
  );

  // === Realtime provider sync ===
  // Register the gameInstanceId with the centralized realtime provider.
  // No cleanup — the provider lives in game/_layout and must keep
  // the socket alive while navigating between game/* screens.
  useEffect(() => {
    if (gameInstanceId) {
      setRealtimeGameInstanceId(gameInstanceId);
    }
  }, [gameInstanceId, setRealtimeGameInstanceId]);

  // Sync game date from realtime provider (server ticks)
  // Only update if the provider has a date and we're not in the middle of a date animation
  useEffect(() => {
    if (realtimeState.gameDate && !isAnimating) {
      setGameDate(realtimeState.gameDate);
    }
  }, [realtimeState.gameDate, isAnimating]);

  // Calcul de la date de fin de jeu (date de départ + durée)
  const calculateEndDate = useCallback((duration: number): Date => {
    const endDate = new Date(GAME_START_DATE);
    endDate.setDate(endDate.getDate() + duration);
    return endDate;
  }, []);

  // Vérifie si le temps est écoulé
  const checkIfTimeElapsed = useCallback((timeState: GameTimeState): boolean => {
    if (timeState.isEnded) return true;

    const now = Date.now();
    const startTime = timeState.createdAt.getTime();

    let elapsedSeconds = Math.floor((now - startTime) / 1000);
    elapsedSeconds -= timeState.totalPausedDuration;

    // Soustraire aussi la durée de pause en cours (même logique que calculateGameDate)
    if (timeState.isPaused && timeState.pausedAt) {
      const currentPauseDuration = Math.floor((now - timeState.pausedAt.getTime()) / 1000);
      elapsedSeconds -= currentPauseDuration;
    }

    elapsedSeconds = Math.max(0, elapsedSeconds);

    const totalDurationSeconds = (timeState.duration / timeState.speed) * 86400;
    return elapsedSeconds >= totalDurationSeconds;
  }, []);

  // Fonction pour terminer la partie quand le temps est écoulé
  const handleGameEnd = useCallback(async () => {
    if (!gameInstanceId || isEndingGame || isGameEnded) return;

    try {
      setIsEndingGame(true);
      console.log('Game time elapsed, checking for pending events before ending...');

      // Safety net: check if the backend has a pending event we missed
      // This prevents ending the game while an event should be displayed
      try {
        const pendingEvent = await trpcClient.auth.getPendingEvent.query();
        if (pendingEvent) {
          console.log('[GameCurrentScreen] Found pending event before game end, showing it instead:', pendingEvent);
          setIsEndingGame(false);
          setIsPaused(true);
          // Let the notification system handle it — the poll will pick it up on next cycle
          return;
        }
      } catch (checkErr) {
        // If the check fails, proceed with ending the game
        console.warn('[GameCurrentScreen] Could not check for pending events:', checkErr);
      }

      console.log('No pending events, ending game...');
      const result = await trpcClient.gameInstance.endGame.mutate({ id: gameInstanceId }) as EndGameResult;

      setEndGameResult(result);
      setIsGameEnded(true);
      setShowEndGameModal(true);
    } catch (err) {
      console.error('Error ending game:', err);
      showAlert('Erreur', 'Impossible de terminer la partie');
    } finally {
      setIsEndingGame(false);
    }
  }, [gameInstanceId, isEndingGame, isGameEnded]);

  // Sync isPaused/isEnded from realtime provider — only if the provider's game matches ours
  useEffect(() => {
    if (!realtimeState.lastServerSyncAt || !gameInstanceId) return;
    if (realtimeState.gameInstanceId !== gameInstanceId) return;

    setIsPaused(realtimeState.isPaused);
    if (realtimeState.isEnded && !isGameEnded) {
      handleGameEnd();
    }
  }, [realtimeState.isPaused, realtimeState.isEnded, realtimeState.lastServerSyncAt, realtimeState.gameInstanceId, gameInstanceId, isGameEnded, handleGameEnd]);

  // Calcul de la date de jeu (purement local, aucun appel backend)
  const calculateGameDate = useCallback((timeState: GameTimeState): Date => {
    // Si la partie est terminée, retourner la date de fin
    if (timeState.isEnded) {
      return calculateEndDate(timeState.duration);
    }

    const now = Date.now();
    const startTime = timeState.createdAt.getTime();

    // Temps réel écoulé (en secondes)
    let elapsedSeconds = Math.floor((now - startTime) / 1000);
    elapsedSeconds -= timeState.totalPausedDuration;

    // Si actuellement en pause, soustraire aussi la durée de pause en cours
    if (timeState.isPaused && timeState.pausedAt) {
      const currentPauseDuration = Math.floor((now - timeState.pausedAt.getTime()) / 1000);
      elapsedSeconds -= currentPauseDuration;
    }

    elapsedSeconds = Math.max(0, elapsedSeconds);

    // Durée totale en secondes réelles
    const totalDurationSeconds = (timeState.duration / timeState.speed) * 86400;

    // Progression en %
    const progressPercent = Math.min(100, (elapsedSeconds / totalDurationSeconds) * 100);

    // Jours de jeu écoulés
    const gameDaysElapsed = (timeState.duration * progressPercent) / 100;

    // Date du jeu
    const gameDate = new Date(GAME_START_DATE);
    gameDate.setDate(gameDate.getDate() + Math.floor(gameDaysElapsed));
    return gameDate;
  }, [calculateEndDate]);

  // Helper function to load holdings + price-based values for a game instance
  const loadHoldings = async (gInstanceId: number, wId?: number | null) => {
    const effectiveWalletId = wId ?? walletId;
    try {
      const holdingsData = await trpcClient.holding.getByGameInstance.query({ gameInstanceId: gInstanceId });
      const hd = (holdingsData as HoldingData[]) ?? [];
      setHoldings(hd);
      const tr = tourRef.current;
      if (tr.sessionActive) {
        await tr.syncHoldings(
          hd.map((h) => ({
            quantity: h.quantity,
            asset: h.asset
              ? {
                  id: h.asset.id,
                  title: h.asset.title,
                  symbol: h.asset.symbol,
                  submarket: h.asset.submarket ?? null,
                }
              : null,
          }))
        );
      }

      // Load portfolio snapshot (values + net invested from transactions)
      if (effectiveWalletId) {
        try {
          type SnapshotHolding = { assetId: number | null; totalValue: number; totalDeposited: number; totalWithdrawn: number };
          const snapshot = await cachedQuery(
            `snapshot:${gInstanceId}`,
            () => trpcClient.investment.getPortfolioSnapshot.query({
              walletId: effectiveWalletId,
              gameInstanceId: gInstanceId,
            }),
            5_000,
          ) as { walletBalance: number; holdings: SnapshotHolding[] } | null;
          if (snapshot) {
            const values: Record<number, number> = {};
            const deposited: Record<number, number> = {};
            const withdrawn: Record<number, number> = {};
            for (const h of snapshot.holdings) {
              if (h.assetId != null) {
                values[h.assetId] = Math.round(h.totalValue);
                deposited[h.assetId] = Math.round(h.totalDeposited);
                withdrawn[h.assetId] = Math.round(h.totalWithdrawn);
              }
            }
            setHoldingValues(values);
            setHoldingDeposited(deposited);
            setHoldingWithdrawn(withdrawn);
          }
        } catch (e) {
          console.error('Error fetching portfolio snapshot:', e);
        }
      }
    } catch (err) {
      console.error('Error fetching holdings:', err);
      setHoldings([]);
      setHoldingDeposited({});
      setHoldingWithdrawn({});
    }
  };

  // Helper function to load wallet balance
  const loadWalletBalance = async (wId: number) => {
    try {
      const wallet = await trpcClient.wallet.getById.query({ id: wId });
      if (wallet?.amount) {
        setStats(prev => ({
          ...prev,
          cash: Number(wallet.amount),
        }));
      }
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
    }
  };

  // Fetch all triggered impacts for this game instance and build assetId → coef map
  const fetchTriggeredImpacts = useCallback(async (gInstanceId: number) => {
    try {
      const events = await trpcClient.gameInstanceEvent.findByGameInstance.query({ gameInstanceId: gInstanceId });
      const triggeredEvents = events.filter((e: any) => e.triggeredAt != null);

      const coefs: Record<number, number> = {};
      for (const gie of triggeredEvents) {
        const eventId = gie.levelEvent?.eventId;
        if (!eventId) continue;

        const impacts = await trpcClient.impact.getByEventId.query({ eventId });
        for (const impact of impacts) {
          if (impact.assetId != null && impact.coef != null) {
            // Cumulate coefficients multiplicatively
            coefs[impact.assetId] = (coefs[impact.assetId] ?? 1) * impact.coef;
          }
        }
      }

      setImpactCoefs(coefs);
    } catch (err) {
      console.error('[GameCurrentScreen] Error fetching triggered impacts:', err);
    }
  }, []);

  // Get adjusted rate for an asset (frontend-only, no DB change)
  const getAdjustedRate = useCallback((assetId: number, rate: number | null): number | null => {
    if (rate == null) return null;
    const coef = impactCoefs[assetId];
    return coef != null ? parseFloat((rate * coef).toFixed(2)) : rate;
  }, [impactCoefs]);

  // Helper function to create game instance and wallet in preparation mode
  const createGameInstanceForPreparation = async (levelData: LevelData) => {
    if (!user || !levelId || !levelData?.level) return null;

    try {
      setIsInitializing(true);

      // Créer une nouvelle GameInstance en mode pause (préparation)
      const gameInstance = await trpcClient.gameInstance.create.mutate({
        levelId: parseInt(levelId, 10),
        userId: user.id,
        startBalance: levelData.level.startBalance,
        isPaused: true, // En mode préparation
        actionRequired: false,
      });

      // Créer le wallet pour cette instance de jeu
      const wallet = await trpcClient.wallet.create.mutate({
        userId: user.id,
        gameInstanceId: gameInstance.id,
        amount: levelData.level.startBalance ?? 1000,
      });

      setGameInstanceId(gameInstance.id);
      setActiveGameInstanceId(gameInstance.id); // Mettre à jour le contexte global
      setWalletId(wallet.id);
      setIsPaused(true);
      setIsGameEnded(false);
      setHoldings([]);
      setHoldingDeposited({});
      setHoldingWithdrawn({});

      return { gameInstance, wallet };
    } catch (err) {
      console.error('Error creating game instance for preparation:', err);
      return null;
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // If we have gameId but no levelId, we can still load the game
      // (e.g., when navigating from a notification)
      if (!levelId && !gameId) {
        setError('ID du niveau ou de la partie manquant');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // If we have a gameId, load the game instance first
        // This handles the case when navigating from a notification
        if (gameId) {
          const gInstanceId = parseInt(gameId, 10);
          setGameInstanceId(gInstanceId);
          setActiveGameInstanceId(gInstanceId);

          try {
            const gameInstance = await trpcClient.gameInstance.getById.query({ id: gInstanceId });
            if (gameInstance) {
              setGameInstanceId(gameInstance.id);
              setIsPaused(gameInstance.isPaused ?? true);
              setIsGameEnded(gameInstance.isEnded ?? false);
              // Si le jeu tourne, a avancé dans les events, ou a un event en cours, il a déjà été démarré
              setGameHasBeenStarted(
                !gameInstance.isPaused || (gameInstance.currentEventIndex ?? 0) > 0 || !!gameInstance.actionRequired
              );

              // Restore pendingEventCompletion if backend has actionRequired=true
              // This handles the case where the user navigates to /current from a notification
              // or the component remounts after the event modal was dismissed
              if (gameInstance.actionRequired && !pendingEventCompletion) {
                console.log('[GameCurrentScreen] 🔄 Restoring pendingEventCompletion on initial load from actionRequired');
                setPendingEventCompletion(gameInstance.id);
              }

              // If we have level data from the gameInstance, fetch full level summary (includes goals)
              if (gameInstance.level) {
                try {
                  const fullLevelData = await trpcClient.level.getSummary.query({ id: gameInstance.level.id });
                  setLevelData(fullLevelData as LevelData);
                  setStats(prev => ({
                    ...prev,
                    level: fullLevelData.level?.number || 1,
                    cash: fullLevelData.level?.startBalance || 1000,
                  }));
                } catch (levelErr) {
                  console.error('Error fetching full level data:', levelErr);
                  // Fallback to basic level data from gameInstance
                  const levelFromGame = {
                    level: {
                      id: gameInstance.level.id,
                      title: gameInstance.level.title ?? null,
                      number: gameInstance.level.number ?? null,
                      description: null,
                      startBalance: gameInstance.level.startBalance ?? null,
                      duration: gameInstance.level.duration ?? null,
                      speed: gameInstance.level.speed ?? null,
                    },
                    goals: [],
                  };
                  setLevelData(levelFromGame);
                  setStats(prev => ({
                    ...prev,
                    level: gameInstance.level?.number || 1,
                    cash: gameInstance.level?.startBalance || 1000,
                  }));
                }
              }

              // Load the wallet associated with this instance
              let loadedWalletId: number | null = null;
              try {
                const wallets = await cachedQuery(
                  `wallet:${gameInstance.id}`,
                  () => trpcClient.wallet.getByGameInstance.query({ gameInstanceId: gameInstance.id }),
                  5_000,
                ) as { id: number; amount: number }[] | null;
                if (wallets && wallets.length > 0) {
                  loadedWalletId = wallets[0].id;
                  setWalletId(wallets[0].id);
                  await loadWalletBalance(wallets[0].id);
                }
              } catch (walletErr) {
                console.error('Error fetching wallet:', walletErr);
              }

              // Load holdings (pass walletId directly since setState is async)
              await loadHoldings(gameInstance.id, loadedWalletId);

              // Initialize game time state
              if (gameInstance.level) {
                const duration = gameInstance.level.duration ?? 30;
                const speed = gameInstance.level.speed ?? 1;
                const isEnded = gameInstance.isEnded ?? false;

                const newTimeState: GameTimeState = {
                  createdAt: new Date(gameInstance.createdAt),
                  totalPausedDuration: gameInstance.totalPausedDuration ?? 0,
                  duration,
                  speed,
                  isEnded,
                  isPaused: gameInstance.isPaused ?? false,
                  pausedAt: gameInstance.pausedAt ? new Date(gameInstance.pausedAt) : null,
                };
                setGameTimeState(newTimeState);

                // Calculate target date for animation
                const target = isEnded
                  ? calculateEndDate(duration)
                  : (() => {
                      const now = Date.now();
                      const startTime = new Date(gameInstance.createdAt).getTime();
                      let elapsedSeconds = Math.floor((now - startTime) / 1000);
                      elapsedSeconds -= (gameInstance.totalPausedDuration ?? 0);

                      if (gameInstance.isPaused && gameInstance.pausedAt) {
                        const currentPauseDuration = Math.floor((now - new Date(gameInstance.pausedAt).getTime()) / 1000);
                        elapsedSeconds -= currentPauseDuration;
                      }

                      elapsedSeconds = Math.max(0, elapsedSeconds);
                      const totalDurationSeconds = (duration / speed) * 86400;
                      const progressPercent = Math.min(100, (elapsedSeconds / totalDurationSeconds) * 100);
                      const gameDaysElapsed = (duration * progressPercent) / 100;
                      const currentDate = new Date(GAME_START_DATE);
                      currentDate.setDate(currentDate.getDate() + Math.floor(gameDaysElapsed));
                      return currentDate;
                    })();

                if (isEnded) {
                  setGameDate(target);
                } else if (target.getTime() > GAME_START_DATE.getTime()) {
                  setTargetDate(target);
                  setGameDate(new Date(GAME_START_DATE));
                  setIsAnimating(true);
                } else {
                  setGameDate(target);
                }
              }
            }
          } catch (err) {
            console.error('Error fetching game instance:', err);
            setGameInstanceId(null);
            setActiveGameInstanceId(null);
            setIsPaused(true);
            setGameTimeState(null);
            setIsGameEnded(false);
            // If we only had gameId and it failed, show error
            if (!levelId) {
              setError('Partie introuvable');
              setIsLoading(false);
              return;
            }
          }
        }

        // If we have levelId, load level data (or skip if already loaded from gameInstance)
        if (levelId) {
          const data = await trpcClient.level.getSummary.query({ id: parseInt(levelId, 10) });
          setLevelData(data as LevelData);

          if (data.level) {
            setStats(prev => ({
              ...prev,
              level: data.level?.number || 1,
              cash: data.level?.startBalance || 1000,
            }));
          }

          // Only create game instance if:
          // 1. No gameId was provided in params (not navigating from notification)
          // 2. We have a user
          // 3. We have level data
          // 4. We don't already have a gameInstanceId set (from previous fetch)
          // This prevents creating a new instance when navigating from a notification
          if (!gameId && !gameInstanceId && user && data.level) {
            const activeGame = await trpcClient.gameInstance.getActiveByUser.query({ userId: user.id });
            if (activeGame) {
              const confirmed = await new Promise<boolean>((resolve) => {
                showAlert(
                  'Partie en cours',
                  'Lancer cette partie va clôturer la partie en cours sans gagner de récompenses. Voulez-vous continuer ?',
                  [
                    { text: 'Annuler', style: 'cancel' as const, onPress: () => resolve(false) },
                    { text: 'Continuer', onPress: () => resolve(true) },
                  ]
                );
              });
              if (!confirmed) {
                setIsLoading(false);
                router.back();
                return;
              }
              await trpcClient.gameInstance.abandon.mutate({ id: activeGame.id });
            }
            await createGameInstanceForPreparation(data as LevelData);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [levelId, gameId, calculateEndDate, user]);

  // Animation visuelle de la date (quand on revient sur une partie)
  // Only updates React state on month boundaries to avoid excessive re-renders.
  // For large date ranges (>60 days), skips animation entirely.
  useEffect(() => {
    if (!isAnimating || !targetDate) return;

    const target = new Date(targetDate);
    const start = new Date(GAME_START_DATE);

    // Skip animation for large date ranges to avoid excessive state updates
    const totalDays = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays > 60) {
      setGameDate(target);
      setIsAnimating(false);
      setTargetDate(null);
      return;
    }

    let animationFrame: ReturnType<typeof setTimeout> | null = null;
    let currentDate = new Date(GAME_START_DATE);

    const animate = () => {
      if (currentDate >= target) {
        setGameDate(target);
        setIsAnimating(false);
        setTargetDate(null);
        return;
      }

      // Vérifier si on change de mois
      const currentMonth = currentDate.getMonth();
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextMonth = nextDate.getMonth();
      const isMonthChange = currentMonth !== nextMonth;

      // Avancer d'un jour
      currentDate = nextDate;

      // Only update React state on month boundaries or at the end to limit re-renders
      if (isMonthChange || currentDate >= target) {
        setGameDate(new Date(currentDate));
      }

      // Pause plus longue au changement de mois
      const delay = isMonthChange ? MONTH_PAUSE_MS : DAY_ANIMATION_MS;
      animationFrame = setTimeout(animate, delay);
    };

    animationFrame = setTimeout(animate, DAY_ANIMATION_MS);

    return () => {
      if (animationFrame) clearTimeout(animationFrame);
    };
  }, [isAnimating, targetDate]);

  // Force pause when an event notification is active
  // This ensures the game pauses immediately when the server triggers an event
  // Also fetch the latest game state from backend to ensure date is in sync
  useEffect(() => {
    if (!gameInstanceId) return;

    // Only force pause when event notification popup is visible
    // Don't force pause based on pendingEventCompletion alone - let backend be source of truth
    if (eventNotification) {
      console.log('[GameCurrentScreen] ⏸️ Forcing pause due to event notification');
      setIsPaused(true);

      // Fetch latest game state from backend to sync the date
      const syncFromBackend = async () => {
        try {
          const instance = await trpcClient.gameInstance.getById.query({ id: gameInstanceId });
          if (instance?.level) {
            console.log('[GameCurrentScreen] 🔄 Syncing game state from backend after event pause');

            // Update gameTimeState - the date will be calculated automatically
            // by the initial date effect which watches gameTimeState changes
            setGameTimeState({
              createdAt: new Date(instance.createdAt),
              totalPausedDuration: instance.totalPausedDuration ?? 0,
              duration: instance.level.duration ?? 30,
              speed: instance.level.speed ?? 1,
              isEnded: instance.isEnded ?? false,
              isPaused: instance.isPaused ?? false,
              pausedAt: instance.pausedAt ? new Date(instance.pausedAt) : null,
            });
          }
        } catch (err) {
          console.error('[GameCurrentScreen] Error syncing game state:', err);
        }
      };

      syncFromBackend();
    }
  }, [eventNotification, gameInstanceId]);

  // Quand la modale d'event demande d'ouvrir le sheet assets,
  // on garde la partie en pause jusqu'à ce que le joueur clique explicitement sur "Reprendre".
  useEffect(() => {
    if (!requestedAssetsSheetGameId) return;
    // Attendre que gameInstanceId et walletId soient initialisés avant d'ouvrir le sheet
    if (!gameInstanceId || !walletId) return;
    if (requestedAssetsSheetGameId !== gameInstanceId) return;

    setRequestedAssetsSheetGameId(null);
    setIsAssetsSheetOpen(true); // Freeze date animation immediately

    const openAssetsFromEvent = async () => {
      await handleAddAsset();
    };

    openAssetsFromEvent();
  }, [requestedAssetsSheetGameId, gameInstanceId, walletId, handleAddAsset, setRequestedAssetsSheetGameId]);

  // Fetch triggered impacts on mount and when eventNotification changes
  useEffect(() => {
    if (!gameInstanceId) return;
    fetchTriggeredImpacts(gameInstanceId);
  }, [gameInstanceId, eventNotification, fetchTriggeredImpacts]);

  // Calculate initial game date whenever gameTimeState changes
  // This ensures the correct date is shown even when paused
  // Skip during animation to avoid fighting with the animation effect
  useEffect(() => {
    if (!gameTimeState || isAnimating) return;

    // Calculate and set the current game date
    const currentDate = calculateGameDate(gameTimeState);
    setGameDate(currentDate);
    console.log('[GameCurrentScreen] 📅 Initial date calculated:', currentDate.toLocaleDateString('fr-FR'));
  }, [gameTimeState, calculateGameDate, isAnimating]);

  // Backup event detection: periodically check backend for pending events during active gameplay.
  // This is a FALLBACK for when the WebSocket connection is down.
  // Primary event delivery is via WebSocket (managed by GameRealtimeProvider).
  // Interval is set to 30s since WS handles the real-time case.
  useEffect(() => {
    if (!gameInstanceId || isPaused || isGameEnded || isEndingGame || eventNotification || pendingEventCompletion) return;

    const EVENT_CHECK_INTERVAL_MS = 30_000;
    const eventCheckInterval = setInterval(() => {
      triggerPendingEventCheck();
    }, EVENT_CHECK_INTERVAL_MS);

    return () => clearInterval(eventCheckInterval);
  }, [gameInstanceId, isPaused, isGameEnded, isEndingGame, eventNotification, pendingEventCompletion, triggerPendingEventCheck]);

  // WebSocket connection is now managed by GameRealtimeProvider (see use-game-realtime.tsx).
  // game:event, game:end, game:pause, game:resume, game:state, game:tick are handled centrally.
  // Local state is synced from realtimeState via the sync effects above.

  // Portfolio refresh interval (10s) — keeps holdings + values up to date during active gameplay
  useEffect(() => {
    if (!gameInstanceId || !walletId || isPaused || isGameEnded) return;

    const refresh = async () => {
      try {
        // Refresh holdings list (new purchases / sales)
        const holdingsData = await trpcClient.holding.getByGameInstance.query({ gameInstanceId });
        setHoldings((holdingsData as HoldingData[]) ?? []);

        // Refresh portfolio snapshot (total values incl. interests + wallet balance + net invested)
        type PortfolioSnapshot = { walletBalance: number; holdings: { assetId: number | null; totalValue: number; totalDeposited: number; totalWithdrawn: number }[] };
        const snapshot = await cachedQuery(
          `snapshot:${gameInstanceId}`,
          () => trpcClient.investment.getPortfolioSnapshot.query({ gameInstanceId, walletId }),
          2_000,
        ) as PortfolioSnapshot | null;

        if (snapshot) {
          // Update wallet balance
          setStats(prev => ({
            ...prev,
            cash: Math.round(snapshot.walletBalance),
          }));

          // Update holding values and deposited/withdrawn by assetId
          const values: Record<number, number> = {};
          const deposited: Record<number, number> = {};
          const withdrawn: Record<number, number> = {};
          for (const h of snapshot.holdings) {
            if (h.assetId != null) {
              values[h.assetId] = Math.round(h.totalValue);
              deposited[h.assetId] = Math.round(h.totalDeposited);
              withdrawn[h.assetId] = Math.round(h.totalWithdrawn);
            }
          }
          setHoldingValues(values);
          setHoldingDeposited(deposited);
          setHoldingWithdrawn(withdrawn);
        }
      } catch (err) {
        console.warn('[GameCurrentScreen] Portfolio refresh failed (keeping last known values):', err);
      }
    };

    const interval = setInterval(refresh, PORTFOLIO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameInstanceId, walletId, isPaused, isGameEnded]);

  // Fallback local date calculation — only active when the WebSocket hasn't synced yet.
  // Primary date updates come from the realtime provider (game:tick/game:state).
  useEffect(() => {
    if (!gameTimeState || isPaused || isAnimating || isGameEnded || isEndingGame || isAssetsSheetOpen) return;
    // If we have recent server data, skip local calculation — server ticks handle it
    if (realtimeState.isConnected && realtimeState.lastServerSyncAt) return;

    // Vérifier immédiatement si le temps est écoulé
    if (checkIfTimeElapsed(gameTimeState)) {
      handleGameEnd();
      return;
    }

    // Fallback: calculate locally
    setGameDate(calculateGameDate(gameTimeState));

    const interval = setInterval(() => {
      if (checkIfTimeElapsed(gameTimeState)) {
        clearInterval(interval);
        handleGameEnd();
        return;
      }
      setGameDate(calculateGameDate(gameTimeState));
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameTimeState, isPaused, isAnimating, isGameEnded, isEndingGame, isAssetsSheetOpen, calculateGameDate, checkIfTimeElapsed, handleGameEnd, realtimeState.isConnected, realtimeState.lastServerSyncAt]);

  // Resynchronisation quand on revient sur la page (sans animation)
  useFocusEffect(
    useCallback(() => {
      if (!gameInstanceId) return;

      const resync = async () => {
        try {
          console.log('[GameCurrentScreen] 🔄 Resyncing game state for gameInstanceId:', gameInstanceId);

          // Invalidate caches to ensure fresh data after returning from other screens
          invalidateCache(`snapshot:${gameInstanceId}`);
          invalidateCache(`portfolio:${gameInstanceId}`);
          invalidateCache(`wallet:${gameInstanceId}`);

          // If returning from asset-detail, resume unless an event is waiting for explicit resume.
          if (navigatedToAssetDetailRef.current && !isAwaitingEventResume) {
            console.log('[GameCurrentScreen] 🔄 Returning from asset-detail → resuming game');
            navigatedToAssetDetailRef.current = false;
            try {
              await trpcClient.gameInstance.resume.mutate({ id: gameInstanceId });
            } catch (err) {
              console.error('[GameCurrentScreen] Error resuming after asset-detail:', err);
            }
          } else if (navigatedToAssetDetailRef.current) {
            console.log('[GameCurrentScreen] 🔄 Returning from asset-detail while awaiting event resume → keeping game paused');
            navigatedToAssetDetailRef.current = false;
          }

          // Add a delay to let the backend process any pending operations
          // /assets has a 150ms delay before calling completeEvent, plus execution time
          // So we wait 400ms to ensure the backend state is up to date
          await new Promise(resolve => setTimeout(resolve, 400));

          const instance = await trpcClient.gameInstance.getById.query({ id: gameInstanceId });
          if (instance?.level) {
            const isEnded = instance.isEnded ?? false;
            const wasPaused = isPaused;
            const nowPaused = instance.isPaused ?? false;

            console.log('[GameCurrentScreen] 📊 Game state: isPaused=', nowPaused, '(was:', wasPaused, '), isEnded=', isEnded);

            setGameTimeState({
              createdAt: new Date(instance.createdAt),
              totalPausedDuration: instance.totalPausedDuration ?? 0,
              duration: instance.level.duration ?? 30,
              speed: instance.level.speed ?? 1,
              isEnded,
              isPaused: nowPaused,
              pausedAt: instance.pausedAt ? new Date(instance.pausedAt) : null,
            });
            setIsPaused(nowPaused);
            setIsGameEnded(isEnded);
            // Si le jeu tourne, a avancé dans les events, ou a un event en cours, il a été démarré
            if (!nowPaused || (instance.currentEventIndex ?? 0) > 0 || !!instance.actionRequired) {
              setGameHasBeenStarted(true);
            }

            // Resync pendingEventCompletion from backend: if the backend says actionRequired=true
            // but frontend lost the pendingEventCompletion state (e.g., component remount),
            // restore it so the "Reprendre" button appears and the user is never stuck.
            if (instance.actionRequired && !pendingEventCompletion) {
              console.log('[GameCurrentScreen] 🔄 Restoring pendingEventCompletion from backend actionRequired');
              setPendingEventCompletion(instance.id);
            }

            if (wasPaused && !nowPaused) {
              console.log('[GameCurrentScreen] ✅ Game was resumed, state updated');
            }

            // Si la partie a été terminée côté serveur (safety net, job schedulé, etc.)
            // et qu'on n'a pas encore affiché la modale → récupérer le résultat et l'afficher
            if (isEnded && !isGameEnded && !endGameResult) {
              console.log('[GameCurrentScreen] 🏁 Game was ended server-side, fetching end game result...');
              try {
                const result = await trpcClient.gameInstance.getEndGameResult.query({ id: gameInstanceId }) as EndGameResult;
                setEndGameResult(result);
                setShowEndGameModal(true);
              } catch (endErr) {
                console.error('[GameCurrentScreen] Error fetching end game result:', endErr);
              }
            }

            // Si la partie est terminée, afficher directement la date de fin
            if (isEnded) {
              const duration = instance.level.duration ?? 30;
              setGameDate(calculateEndDate(duration));
            }
          }

          // Recharger les holdings et le solde du wallet
          await loadHoldings(gameInstanceId);
          if (walletId) {
            await loadWalletBalance(walletId);
          }
        } catch (err) {
          console.error('[GameCurrentScreen] Error resyncing game state:', err);
        }
      };

      resync();
    }, [gameInstanceId, calculateEndDate, isPaused, walletId, isAwaitingEventResume, pendingEventCompletion, setPendingEventCompletion])
  );

  // Configure header: static options on focus
  // Set header title once level data is loaded — useEffect (not useFocusEffect)
  // so it reacts to stats.level changing even while the screen is already focused
  useEffect(() => {
    if (stats.level <= 0) return;
    setHeaderOptions({
      showBackButton: true,
      title: `Niveau ${stats.level}`,
      onBackPress: () => {
        const canGoBack = 'canGoBack' in router && typeof router.canGoBack === 'function' && router.canGoBack();
        if (canGoBack) {
          router.back();
          return;
        }
        router.replace('/(tabs)');
      },
      onTitlePress: isGameEnded ? undefined : () => setShowLevelInfoModal(true),
    });
  }, [setHeaderOptions, stats.level, isGameEnded]);

  // Configure header: dynamic subtitle from centralized realtime provider
  // This uses the same hook as other game/* screens for consistent display
  // Fallback: format gameDate locally if realtime provider hasn't synced yet
  const localFormattedDate = gameInstanceId
    ? `${String(gameDate.getDate()).padStart(2, '0')}/${String(gameDate.getMonth() + 1).padStart(2, '0')}/${gameDate.getFullYear()}`
    : null;
  const tutorialOverlayVisible =
    tour.sessionActive &&
    (tour.step === Level1TourStep.OpenInvestSheet ||
      tour.step === Level1TourStep.CloseSheetAndPressStart ||
      tour.step === Level1TourStep.FirstEventResume ||
      tour.step === Level1TourStep.PostEventOpenAssets ||
      tour.step === Level1TourStep.PostEventResume);
  // Don't inject subtitle until level is loaded (avoids header flicker)
  useGameHeaderSubtitle(
    stats.level > 0 ? (formattedGameDate ?? localFormattedDate) : null,
    isPaused,
    isGameEnded,
  );

  // Clear subtitle and title press when game ends
  useEffect(() => {
    if (isGameEnded) {
      setHeaderOptions({
        subtitle: undefined,
        onTitlePress: undefined,
      });
    }
  }, [isGameEnded, setHeaderOptions]);

  // Dim header when assets bottom sheet is open
  useEffect(() => {
    setHeaderOptions({ dimmed: tutorialOverlayVisible });
  }, [tutorialOverlayVisible, setHeaderOptions]);

  // Auto-show level info modal for new games (when no gameId is passed)
  useEffect(() => {
    // Only show once per session, only for new games, and only after level data is loaded
    if (!gameId && levelData?.level && !isLoading && !hasShownLevelInfoRef.current) {
      hasShownLevelInfoRef.current = true;
      setShowLevelInfoModal(true);
    }
  }, [gameId, levelData, isLoading]);

  useEffect(() => {
    // Require levelData (not necessarily level nested object — some payloads can be minimal).
    if (isLoading || !user || !gameInstanceId || !levelData) return;
    const initSeq = ++level1TourInitSeqRef.current;
    let cancelled = false;
    void (async () => {
      try {
        let hasRecord = false;
        try {
          hasRecord = await trpcClient.levelCompletion.hasCompletedLevelByNumber.query({
            levelNumber: 1,
          });
        } catch (completionErr) {
          // Backend unreachable, old client, or missing procedure — still start the tour for level 1.
          console.warn('[GameCurrent] levelCompletion.hasCompletedLevelByNumber failed, assuming no completion', completionErr);
        }
        if (cancelled || initSeq !== level1TourInitSeqRef.current) return;
        const resolvedLevelNumber =
          levelData.level?.number != null && Number.isFinite(Number(levelData.level.number))
            ? Number(levelData.level.number)
            : stats.level > 0
              ? stats.level
              : null;
        const levelForTour = resolvedLevelNumber ?? (stats.level === 1 ? 1 : null);
        await tourRef.current.initFromGameScreen({
          userId: user.id,
          gameInstanceId,
          levelNumber: levelForTour,
          hasLevel1CompletionRecord: Boolean(hasRecord),
        });
      } catch (e) {
        console.warn('[GameCurrent] level1 tour init failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    user,
    gameInstanceId,
    levelData?.level?.number,
    levelData?.level?.id,
    stats.level,
  ]);

  useEffect(() => {
    const now = gameInstanceId != null && pendingEventCompletion === gameInstanceId;
    if (!tourRef.current.sessionActive) {
      prevPendingEventRef.current = now;
      return;
    }
    if (!gameInstanceId) {
      prevPendingEventRef.current = false;
      return;
    }
    if (now && !prevPendingEventRef.current) {
      void (async () => {
        const t = tourRef.current;
        if (t.step === Level1TourStep.WaitFirstEvent && t.eventPhase === 0) {
          await t.goToStep(Level1TourStep.PostEventOpenAssets);
        }
      })();
    }
    prevPendingEventRef.current = now;
  }, [gameInstanceId, pendingEventCompletion, tour.sessionActive, tour.step, tour.eventPhase]);

  useEffect(() => {
    const t = tourRef.current;
    if (!t.sessionActive) return;
    if (t.step !== Level1TourStep.OpenInvestSheet) return;
    if (!isAssetsSheetOpen) return;
    void t.goToStep(Level1TourStep.SelectLivretAInSheet);
  }, [tour.sessionActive, tour.step, isAssetsSheetOpen]);

  useEffect(() => {
    const t = tourRef.current;
    if (!t.sessionActive) return;
    if (t.step !== Level1TourStep.PostEventOpenAssets) return;
    if (!isAssetsSheetOpen) return;
    void t.goToStep(Level1TourStep.SelectLivretAForWithdraw);
  }, [tour.sessionActive, tour.step, isAssetsSheetOpen]);

  useEffect(() => {
    const t = tourRef.current;
    if (!t.sessionActive || t.step !== Level1TourStep.SelectLivretAInSheet) return;
    if (allAssets.length === 0) return;
    const hasLivret = allAssets.some((a: { title?: string | null; symbol?: string | null }) =>
      isLivretAAsset({ title: a.title, symbol: a.symbol })
    );
    if (!hasLivret) void t.abortTour();
  }, [tour.sessionActive, tour.step, allAssets]);

  useEffect(() => {
    if (!tour.sessionActive) return;
    if (
      tour.step === Level1TourStep.SelectLivretAInSheet ||
      tour.step === Level1TourStep.SelectLivretAForWithdraw ||
      tour.step === Level1TourStep.WithdrawAndMoveToOtherLivret
    ) {
      setAssetsSearchQuery('');
      setSelectedSubmarketId(null);
    }
  }, [tour.sessionActive, tour.step]);

  useEffect(() => {
    const fetchLevelQuizId = async () => {
      if (!levelData?.level?.id) {
        setLevelQuizId(null);
        return;
      }

      try {
        const quizzes = await trpcClient.quiz.getByLevel.query({ levelId: levelData.level.id });
        setLevelQuizId(quizzes?.[0]?.id ?? null);
      } catch (err) {
        console.error('Error fetching level quiz for end-game modal:', err);
        setLevelQuizId(null);
      }
    };

    fetchLevelQuizId();
  }, [levelData?.level?.id]);

  const handleOpenRecap = async () => {
    if (!gameInstanceId) return;
    if (
      endGameResult?.success &&
      levelQuizId &&
      tour.sessionActive &&
      tour.step === Level1TourStep.AwaitEndGameChoice
    ) {
      await tour.goToStep(Level1TourStep.SummaryQuizPrompt);
    } else if (tour.sessionActive && tour.step === Level1TourStep.AwaitEndGameChoice) {
      await tour.abortTour();
    }
    setShowEndGameModal(false);
    trpcClient.notification.markGameEndAsRead.mutate({ gameInstanceId }).catch(console.error);
    router.replace({
      pathname: '/(tabs)/summary',
      params: { gameId: gameInstanceId.toString() },
    });
  };

  const handleOpenQuiz = async () => {
    if (!endGameResult?.success) return;
    if (!levelQuizId) {
      showAlert('Quiz indisponible', "Aucun quiz n'est associe a ce niveau pour le moment.");
      return;
    }
    if (tour.sessionActive) {
      await tour.abortTour();
    }
    setShowEndGameModal(false);
    if (gameInstanceId) {
      trpcClient.notification.markGameEndAsRead.mutate({ gameInstanceId }).catch(console.error);
    }
    router.push({
      pathname: '/(tabs)/daily-quiz',
      params: {
        source: 'level_endgame',
        quizId: levelQuizId.toString(),
        gameInstanceId: gameInstanceId ? gameInstanceId.toString() : '',
      },
    });
  };

  const handleReplay = async () => {
    if (!user?.id || !levelData?.level?.id) return;

    if (gameInstanceId) {
      trpcClient.notification.markGameEndAsRead.mutate({ gameInstanceId }).catch(console.error);
    }

    try {
      setIsReplayCreating(true);
      const startBalance = levelData.level.startBalance ?? 1000;
      const newGame = await trpcClient.gameInstance.create.mutate({
        userId: user.id,
        levelId: levelData.level.id,
        startBalance,
        isPaused: true,
      });
      const wallet = await trpcClient.wallet.create.mutate({
        userId: user.id,
        gameInstanceId: newGame.id,
        amount: startBalance,
      });

      setShowEndGameModal(false);

      // Reset realtime provider before switching game to avoid stale isEnded triggering handleGameEnd
      setRealtimeGameInstanceId(null);

      setIsGameEnded(false);
      setEndGameResult(null);
      setGameTimeState(null);
      setGameDate(GAME_START_DATE);
      setHoldings([]);
      setHoldingDeposited({});
      setHoldingWithdrawn({});
      setIsPaused(true);

      setGameInstanceId(newGame.id);
      setWalletId(wallet.id);

      router.replace({
        pathname: '/game/current',
        params: {
          gameId: String(newGame.id),
          levelId: String(levelData.level.id),
        },
      });
      hasShownLevelInfoRef.current = false;
      setShowLevelInfoModal(true);
      setStats((prev) => ({
        ...prev,
        cash: startBalance,
        timePassed: '0m',
      }));
    } catch (err) {
      console.error('Error creating replay game:', err);
      showAlert('Erreur', 'Impossible de créer la partie');
    } finally {
      setIsReplayCreating(false);
    }
  };

  // Fetch only the assets available for the current game level
  const fetchAvailableAssets = useCallback(async () => {
    if (!gameInstanceId) return;

    try {
      setAssetsLoading(true);
      const data = await trpcClient.asset.getAvailableForGame.query({ gameInstanceId });
      setAllAssets(data as any[]);
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setAssetsLoading(false);
    }
  }, [gameInstanceId]);

  // Fetch available assets on mount for submarket badges
  useEffect(() => {
    if (gameInstanceId) {
      fetchAvailableAssets();
    }
  }, [gameInstanceId, fetchAvailableAssets]);

  // Extract unique submarkets from assets
  const submarkets = useMemo(() => {
    const map = new Map<number, string>();
    for (const asset of allAssets) {
      if (asset.submarket?.id && asset.submarket?.title) {
        map.set(asset.submarket.id, asset.submarket.title);
      }
    }
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [allAssets]);

  // Filter assets by submarket and search query
  const filteredAssets = useMemo(() => {
    let result = allAssets;
    if (selectedSubmarketId !== null) {
      result = result.filter((a: any) => a.submarket?.id === selectedSubmarketId);
    }
    const q = assetsSearchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((a: any) =>
        (a.title ?? '').toLowerCase().includes(q) ||
        (a.symbol ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [allAssets, selectedSubmarketId, assetsSearchQuery]);

  const tourRestrictsAssetPicker = useMemo(
    () =>
      tour.sessionActive &&
      (tour.step === Level1TourStep.SelectLivretAInSheet ||
        tour.step === Level1TourStep.SelectLivretAForWithdraw ||
        tour.step === Level1TourStep.WithdrawAndMoveToOtherLivret),
    [tour.sessionActive, tour.step],
  );

  const assetsListForSheet = filteredAssets;

  // Map assetId → submarket info for badge display
  const assetSubmarketMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const asset of allAssets) {
      if (asset.id && asset.submarket?.title) {
        map.set(asset.id, asset.submarket.title);
      }
    }
    return map;
  }, [allAssets]);

  // Badge colors per submarket type
  const getSubmarketBadgeStyle = useCallback((submarketTitle: string) => {
    const lower = submarketTitle.toLowerCase();
    if (lower.includes('epargne') || lower.includes('épargne')) return { bg: '#C8E6C9', text: '#388E3C' };
    if (lower.includes('bourse') || lower.includes('action')) return { bg: '#E1D5F0', text: '#6A1B9A' };
    if (lower.includes('crypto')) return { bg: '#FFE0B2', text: '#E65100' };
    if (lower.includes('immobilier')) return { bg: '#B3E5FC', text: '#0277BD' };
    return { bg: '#E0E0E0', text: '#616161' };
  }, []);

  // Total portfolio value (cash + all holdings)
  const totalPortfolio = useMemo(() => {
    const holdingsTotal = holdings.reduce((sum, h) => {
      const assetId = h.asset?.id ?? 0;
      return sum + (holdingValues[assetId] ?? Number(h.quantity ?? 0));
    }, 0);
    return Math.round(stats.cash + holdingsTotal);
  }, [stats.cash, holdings, holdingValues]);

  // Render backdrop for assets sheet
  const renderAssetsBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Handle assets sheet state changes (pause/resume game)
  const handleAssetsSheetChange = useCallback(async (index: number) => {
    if (!gameInstanceId) return;
    // En mode préparation (avant "Démarrer"), pas de pause/resume
    if (!gameHasBeenStarted) {
      if (index < 0) {
        setIsAssetsSheetOpen(false);
        setAssetsSearchQuery('');
        setSelectedSubmarketId(null);
      } else {
        setIsAssetsSheetOpen(true);
      }
      return;
    }
    try {
      if (index >= 0) {
        // Game is already paused by handleAddAsset or openAssetsFromEvent before expanding.
        setIsAssetsSheetOpen(true);
        // Call pause again as a safety net (backend pause is idempotent).
        if (!isPaused) {
          console.log('[GameCurrentScreen] 🛒 Assets sheet OPENED → pausing game');
          await trpcClient.gameInstance.pause.mutate({ id: gameInstanceId });
          setIsPaused(true);
          console.log('[GameCurrentScreen] 🛒 Game paused (sheet open)');
        }
      } else {
        // Sheet is closing
        if (skipResumeOnCloseRef.current) {
          // Navigating to asset-detail — keep game paused
          console.log('[GameCurrentScreen] 🛒 Assets sheet CLOSED → navigating to asset-detail, keeping game paused');
          skipResumeOnCloseRef.current = false;
        } else if (isAwaitingEventResume) {
          console.log('[GameCurrentScreen] 🛒 Assets sheet CLOSED while awaiting event resume → keeping game paused');
        } else {
          console.log('[GameCurrentScreen] 🛒 Assets sheet CLOSED → resuming game');
          await trpcClient.gameInstance.resume.mutate({ id: gameInstanceId });
          // Resync game state BEFORE unpausing to avoid stale totalPausedDuration
          const instance = await trpcClient.gameInstance.getById.query({ id: gameInstanceId });
          if (instance?.level) {
            setGameTimeState({
              createdAt: new Date(instance.createdAt),
              totalPausedDuration: instance.totalPausedDuration ?? 0,
              duration: instance.level.duration ?? 30,
              speed: instance.level.speed ?? 1,
              isEnded: instance.isEnded ?? false,
              isPaused: instance.isPaused ?? false,
              pausedAt: instance.pausedAt ? new Date(instance.pausedAt) : null,
            });
          }
          setIsPaused(false);
          console.log('[GameCurrentScreen] 🛒 Game resumed');
        }
        // Reset search, filter and sheet state when closing
        setIsAssetsSheetOpen(false);
        setAssetsSearchQuery('');
        setSelectedSubmarketId(null);
      }
    } catch (err) {
      console.error('Error pausing/resuming game from assets sheet:', err);
    }
  }, [gameInstanceId, gameHasBeenStarted, isPaused, isAwaitingEventResume]);

  const handleAddAsset = useCallback(async () => {
    if (!gameInstanceId || !walletId) {
      showAlert('Erreur', 'Initialisation en cours, veuillez patienter...');
      return;
    }
    const ta = tourRef.current;
    if (ta.sessionActive && ta.step === Level1TourStep.CloseSheetAndPressStart) {
      showAlert('Tutoriel', tourBubbleForStep(ta.step, ta.eventPhase));
      return;
    }
    if (isAssetsSheetOpen) {
      return;
    }
    // Mark sheet as open immediately to freeze date animation
    setIsAssetsSheetOpen(true);
    // Pause the game before opening the sheet
    if (gameHasBeenStarted) {
      try {
        await trpcClient.gameInstance.pause.mutate({ id: gameInstanceId });
        setIsPaused(true);
      } catch (err) {
        console.error('[GameCurrentScreen] Error pausing for assets sheet:', err);
      }
    }
    // Fetch assets if not loaded yet
    if (allAssets.length === 0) {
      fetchAvailableAssets();
    }
    assetsSheetRef.current?.present();
  }, [allAssets.length, fetchAvailableAssets, gameHasBeenStarted, gameInstanceId, isAssetsSheetOpen, showAlert, walletId]);

  const handleResumeAfterEvent = async () => {
    if (!gameInstanceId || !isAwaitingEventResume) {
      return;
    }

    try {
      setIsStarting(true);
      console.log('[GameCurrentScreen] ▶️ Completing event and resuming game', gameInstanceId);
      await trpcClient.gameInstance.completeEvent.mutate({ id: gameInstanceId });
      setPendingEventCompletion(null);

      const instance = await trpcClient.gameInstance.getById.query({ id: gameInstanceId });
      if (instance?.level) {
        setGameTimeState({
          createdAt: new Date(instance.createdAt),
          totalPausedDuration: instance.totalPausedDuration ?? 0,
          duration: instance.level.duration ?? 30,
          speed: instance.level.speed ?? 1,
          isEnded: instance.isEnded ?? false,
          isPaused: instance.isPaused ?? false,
          pausedAt: instance.pausedAt ? new Date(instance.pausedAt) : null,
        });
      }

      setIsPaused(false);
      console.log('[GameCurrentScreen] ✅ Event completed, game resumed');
      await tourRef.current.notifyEventResumeCompleted();
    } catch (err) {
      console.error('[GameCurrentScreen] Error resuming after event:', err);
      showAlert('Erreur', 'Impossible de reprendre la partie');
    } finally {
      setIsStarting(false);
    }
  };

  // Manual resume for when the game is paused without an event pending
  // This is a safety net for edge cases where the game gets stuck in paused state
  const handleManualResume = async () => {
    if (!gameInstanceId || !hasGameStarted || !isPaused || isInPreparation) return;

    try {
      setIsStarting(true);
      console.log('[GameCurrentScreen] ▶️ Manual resume for stuck paused game', gameInstanceId);

      // If backend still has actionRequired (e.g., pendingEventCompletion was lost),
      // use completeEvent to properly clear the event state before resuming
      const checkInstance = await trpcClient.gameInstance.getById.query({ id: gameInstanceId });
      if (checkInstance?.actionRequired) {
        console.log('[GameCurrentScreen] 🔧 Backend has actionRequired=true, completing event first');
        await trpcClient.gameInstance.completeEvent.mutate({ id: gameInstanceId });
        setPendingEventCompletion(null);
      } else {
        await trpcClient.gameInstance.resume.mutate({ id: gameInstanceId });
      }

      const instance = await trpcClient.gameInstance.getById.query({ id: gameInstanceId });
      if (instance?.level) {
        setGameTimeState({
          createdAt: new Date(instance.createdAt),
          totalPausedDuration: instance.totalPausedDuration ?? 0,
          duration: instance.level.duration ?? 30,
          speed: instance.level.speed ?? 1,
          isEnded: instance.isEnded ?? false,
          isPaused: instance.isPaused ?? false,
          pausedAt: instance.pausedAt ? new Date(instance.pausedAt) : null,
        });
        setIsPaused(instance.isPaused ?? false);
      } else {
        setIsPaused(false);
      }
      console.log('[GameCurrentScreen] ✅ Manual resume completed');
    } catch (err) {
      console.error('[GameCurrentScreen] Error in manual resume:', err);
      showAlert('Erreur', 'Impossible de reprendre la partie');
    } finally {
      setIsStarting(false);
    }
  };

  const handleHoldingPress = async (holding: HoldingData) => {
    if (!gameInstanceId || !walletId || !holding.asset) return;
    const trh = tourRef.current;
    if (trh.sessionActive && trh.step === Level1TourStep.SelectLivretAForWithdraw) {
      if (!isLivretAAsset(holding.asset)) {
        showAlert('Tutoriel', tourBubbleForStep(trh.step, trh.eventPhase));
        return;
      }
    }
    // Pause the game while on asset-detail
    if (gameHasBeenStarted) {
      try {
        await trpcClient.gameInstance.pause.mutate({ id: gameInstanceId });
        setIsPaused(true);
        navigatedToAssetDetailRef.current = true;
      } catch (err) {
        console.error('[GameCurrentScreen] Error pausing for holding press:', err);
      }
    }
    router.push({
      pathname: '/game/asset-detail',
      params: {
        id: holding.asset.id.toString(),
        gameInstanceId: gameInstanceId.toString(),
        walletId: walletId.toString(),
      },
    });
  };

  // Fonction pour effectivement démarrer le jeu (unpause)
  const startGameNow = async () => {
    if (!gameInstanceId || !levelData?.level) {
      showAlert('Erreur', 'Instance de jeu non trouvée');
      return;
    }

    try {
      setIsStarting(true);

      await trpcClient.gameInstance.start.mutate({ id: gameInstanceId });

      setActiveGameInstanceId(gameInstanceId); // Mettre à jour le contexte global
      setGameHasBeenStarted(true); // Le jeu a été démarré
      setIsPaused(false); // Le jeu démarre
      setIsAnimating(false);
      setTargetDate(null);
      setGameDate(new Date(GAME_START_DATE)); // Commencer au jour 1

      // Initialiser l'état du temps pour l'animation locale
      setGameTimeState({
        createdAt: new Date(), // Le jeu vient de démarrer
        totalPausedDuration: 0,
        duration: levelData.level.duration ?? 30,
        speed: levelData.level.speed ?? 1,
        isEnded: false,
        isPaused: false,
        pausedAt: null,
      });
      await tourRef.current.notifyGameClockStarted();
    } catch (err) {
      console.error('Error starting game:', err);
      showAlert('Erreur', 'Impossible de demarrer la partie');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartGame = async () => {
    if (!user) {
      showAlert('Erreur', 'Vous devez etre connecte pour jouer');
      return;
    }

    if (!gameInstanceId) {
      showAlert('Erreur', 'Initialisation en cours, veuillez patienter...');
      return;
    }

    const trStart = tourRef.current;
    if (trStart.sessionActive) {
      const st = trStart.step;
      if (
        st === Level1TourStep.OpenInvestSheet ||
        st === Level1TourStep.SelectLivretAInSheet ||
        st === Level1TourStep.DepositOnLivretA
      ) {
        showAlert('Tutoriel', tourBubbleForStep(st, trStart.eventPhase));
        return;
      }
      if (st === Level1TourStep.CloseSheetAndPressStart && holdings.length === 0) {
        showAlert('Tutoriel', "Placez d'abord de l'argent sur le Livret A.");
        return;
      }
    }

    // Vérifier si des investissements ont été faits
    if (holdings.length === 0) {
      if (trStart.sessionActive && trStart.step !== Level1TourStep.CloseSheetAndPressStart) {
        showAlert('Tutoriel', tourBubbleForStep(trStart.step, trStart.eventPhase));
        return;
      }
      setShowNoInvestmentModal(true);
      return;
    }

    // Des investissements existent, démarrer directement
    await startGameNow();
  };

  // Confirmation pour démarrer sans investissement
  const handleConfirmStartWithoutInvestment = async () => {
    if (tourRef.current.sessionActive) {
      showAlert('Tutoriel', 'Suivez les étapes : investissez sur le Livret A avant de commencer.');
      return;
    }
    setShowNoInvestmentModal(false);
    await startGameNow();
  };

  const handleResetLevel = async () => {
    if (!user || !levelId) return;

    showAlert(
      'Reinitialiser le niveau',
      'Cette action supprimera toutes vos parties sur ce niveau. Voulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Reinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              await trpcClient.gameInstance.resetLevel.mutate({
                userId: user.id,
                levelId: parseInt(levelId, 10),
              });

              await tourRef.current.abortTour();

              // Reinitialiser les etats locaux
              setGameInstanceId(null);
              setWalletId(null);
              setIsPaused(true);
              setIsGameEnded(false);
              setGameTimeState(null);
              setGameDate(GAME_START_DATE);
              // Créer automatiquement une nouvelle instance en mode préparation
              if (levelData) {
                await createGameInstanceForPreparation(levelData);
              }
              showAlert('Succes', 'Le niveau a ete reinitialise. Vous pouvez recommencer !');
            } catch (err) {
              console.error('Error resetting level:', err);
              showAlert('Erreur', 'Impossible de reinitialiser le niveau');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const hasPrimaryGoalSuccess = endGameResult?.success === true;
  const modalContent = endGameResult?.modal;
  // Use actual stars from level completion if available, otherwise derive from modal type
  const modalStarFillCount = endGameResult?.stars
    ?? (modalContent?.type === 'PRIMARY_AND_SECONDARY_SUCCESS'
      ? 2
      : modalContent?.type === 'PRIMARY_SUCCESS_ONLY'
        ? 1
        : 0);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}>
        {/* Portfolio Total Card */}
        <View style={[styles.portfolioCard, { backgroundColor: theme.card }]}>
          <View style={styles.portfolioRow}>
            <Text style={[styles.portfolioLabel, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
              Total
            </Text>
            <Text style={[styles.portfolioTotal, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
              {totalPortfolio.toLocaleString('fr-FR')}€
            </Text>
          </View>
        </View>

        <View style={styles.portfolioSeparator} />

        {/* Cash Row */}
        <View style={[styles.assetRow, { backgroundColor: theme.card }]}>
          <View style={styles.assetRowContent}>
            <View style={styles.assetRowTopLine}>
              <Text style={[styles.assetRowName, { color: theme.text, fontFamily: 'Anybody' }]}>
                Portefeuille
              </Text>
              <Text style={[styles.assetRowAmount, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                {stats.cash.toLocaleString('fr-FR')}€
              </Text>
            </View>
            <View style={[styles.assetBadge, { backgroundColor: '#C8E6C9' }]}>
              <Text style={[styles.assetBadgeText, { color: '#388E3C' }]}>Cash</Text>
            </View>
          </View>
        </View>

        {/* Holdings */}
        {holdings.map((holding) => {
          const submarketTitle = assetSubmarketMap.get(holding.asset?.id ?? 0);
          const badgeStyle = submarketTitle ? getSubmarketBadgeStyle(submarketTitle) : null;
          const assetId = holding.asset?.id ?? 0;
          const totalVal = holdingValues[assetId] ?? Math.round(Number(holding.quantity ?? 0));
          const deposited = holdingDeposited[assetId] ?? Math.round(Number(holding.quantity ?? 0));
          const withdrawn = holdingWithdrawn[assetId] ?? 0;
          const perfAbsolute = totalVal + withdrawn - deposited;
          const perfPercent = deposited > 0 ? Math.round((perfAbsolute / deposited) * 100) : 0;
          const perfColor = perfAbsolute === 0 ? '#999' : perfAbsolute > 0 ? '#88D498' : '#E8889A';
          const sign = perfAbsolute > 0 ? '+' : '';
          return (
            <TouchableOpacity
              key={holding.id}
              style={[styles.assetRow, { backgroundColor: theme.card }]}
              onPress={() => handleHoldingPress(holding)}
              activeOpacity={0.7}
            >
              <View style={styles.assetRowContent}>
                <View style={styles.assetRowTopLine}>
                  <Text style={[styles.assetRowName, { color: theme.text, fontFamily: 'Anybody' }]}>
                    {holding.asset?.title ?? 'Asset'}
                  </Text>
                  <Text style={[styles.assetRowAmount, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                    {totalVal.toLocaleString('fr-FR')}€
                  </Text>
                </View>
                <View style={styles.assetRowBottomLine}>
                  {badgeStyle ? (
                    <View style={[styles.assetBadge, { backgroundColor: badgeStyle.bg }]}>
                      <Text style={[styles.assetBadgeText, { color: badgeStyle.text }]}>
                        {submarketTitle}
                      </Text>
                    </View>
                  ) : <View />}
                  <Text style={[styles.assetRowPerfLine, { color: perfColor, fontFamily: CashouTheme.fonts.subheading }]}>
                    {sign}{perfPercent}% ({sign}{perfAbsolute.toLocaleString('fr-FR')}€)
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal de confirmation si aucun investissement */}
      <Modal
        visible={showNoInvestmentModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowNoInvestmentModal(false)}
      >
        <BlurView
          intensity={60}
          tint={isDark ? 'dark' : 'light'}
          style={styles.endGameBlur}
        >
          <View style={styles.endGameOverlay}>
            <View style={[styles.endGameCardBackdrop, { backgroundColor: theme.secondary }]}>
              <View style={[styles.endGameCard, { backgroundColor: theme.card, shadowColor: theme.border, alignItems: 'center' }]}>
                <Text allowFontScaling={false} style={[styles.endGameTitle, { fontFamily: 'Anybody', color: theme.text }]}>
                  Aucun investissement
                </Text>
                <Text allowFontScaling={false} style={[styles.endGameMessage, { fontFamily: 'Anybody', color: theme.text, textAlign: 'center' }]}>
                  {"Vous n'avez fait aucun investissement. Si vous démarrez maintenant, vous ne pourrez pas gagner d'argent pendant la partie."}
                </Text>
                <Text allowFontScaling={false} style={[styles.endGameMessage, styles.endGameSecondary, { fontFamily: 'Anybody', color: theme.text, textAlign: 'center', marginBottom: 16 }]}>
                  Voulez-vous vraiment démarrer sans investir ?
                </Text>
                <View style={styles.endGameActions}>
                  <ActionPillButton
                    label="Investir"
                    iconName="add"
                    onPress={() => {
                      setShowNoInvestmentModal(false);
                      handleAddAsset();
                    }}
                    style={{ flex: 1 }}
                  />
                  <ActionPillButton
                    label="Démarrer"
                    iconName="play"
                    onPress={handleConfirmStartWithoutInvestment}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Modale de fin de partie */}
      <Modal
        visible={showEndGameModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <BlurView
          intensity={60}
          tint={isDark ? 'dark' : 'light'}
          style={styles.endGameBlur}
        >
          <View style={[styles.endGameOverlay, { backgroundColor: 'transparent' }]}>
            <View style={[styles.endGameCardBackdrop, { backgroundColor: theme.secondary }]}>
            <View style={[styles.endGameCard, { backgroundColor: theme.card, shadowColor: theme.border }]}>
            <Text allowFontScaling={false} style={[styles.endGameTitle, { fontFamily: 'Anybody', color: theme.text }]}>
              {modalContent?.title ?? (hasPrimaryGoalSuccess ? 'Bravo !' : 'Dommage !')}
            </Text>

            <Text allowFontScaling={false} style={[styles.endGameMessage, { fontFamily: 'Anybody', color: theme.text }]}>
              {modalContent?.primaryMessage ?? endGameResult?.message}
            </Text>

            {!!modalContent?.secondaryMessage && (
              <Text allowFontScaling={false} style={[styles.endGameMessage, styles.endGameSecondary, { fontFamily: 'Anybody', color: theme.text }]}>
                {modalContent.secondaryMessage}
              </Text>
            )}

            {!!modalContent?.tip && !hasPrimaryGoalSuccess && (
              <Text allowFontScaling={false} style={[styles.endGameTip, { fontFamily: 'Anybody', color: theme.text }]}>
                {modalContent.tip}
              </Text>
            )}

            {/* Goals list */}
            {endGameResult?.goals && endGameResult.goals.length > 0 && (
              <View style={{ width: '100%', marginTop: 8, marginBottom: 12, gap: 8 }}>
                {endGameResult.goals.map((goal) => (
                  <View key={goal.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons
                      name={goal.validated ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={goal.validated ? '#88D498' : '#E8889A'}
                    />
                    <Text
                      allowFontScaling={false}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: 'Anybody',
                        color: theme.text,
                        opacity: 0.85,
                      }}
                    >
                      {goal.title}
                      {!goal.isMandatory && (
                        <Text style={{ fontSize: 12, opacity: 0.6 }}> (bonus)</Text>
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.endGameStarsRow}>
              {[0, 1, 2].map((index) => (
                <GoalStarIcon
                  key={index}
                  filled={index < modalStarFillCount}
                  size={16}
                  idSuffix={`end-game-${index}`}
                />
              ))}
            </View>

            <View style={styles.endGameActions}>
              {hasPrimaryGoalSuccess ? (
                <>
                  <ActionPillButton
                    label="Récap"
                    customIcon={<RecapActionIcon width={22} height={22} />}
                    onPress={() => {
                      void handleOpenRecap();
                    }}
                    style={{ flex: 1 }}
                  />
                  <ActionPillButton
                    label="Quiz"
                    customIcon={<QuizActionIcon width={18} height={18} />}
                    onPress={() => {
                      void handleOpenQuiz();
                    }}
                    style={{ flex: 1 }}
                  />
                </>
              ) : (
                <ActionPillButton
                  label="Rejouer"
                  iconName="refresh-outline"
                  onPress={handleReplay}
                  disabled={isReplayCreating}
                  isLoading={isReplayCreating}
                />
              )}
            </View>
            </View>
          </View>
          </View>
        </BlurView>
      </Modal>

      {/* Modal d'informations du niveau */}
      <LevelInfoModal
        visible={showLevelInfoModal}
        onClose={() => setShowLevelInfoModal(false)}
        fromCurrentScreen
        level={levelData?.level ? {
          ...levelData.level,
          description: levelData.level.description ?? null,
        } : null}
        goals={
          (levelData?.levelGoals?.map((lg) => ({
            id: lg.goal.id,
            title: lg.goal.title,
            description: lg.goal.description,
            isMandatory: lg.isMandatory,
          })) ?? levelData?.goals) ?? []
        }
      />

      {/* Assets Bottom Sheet */}
      <BottomSheetModal
        ref={assetsSheetRef}
        snapPoints={['85%']}
        onChange={handleAssetsSheetChange}
        enablePanDownToClose
        backdropComponent={renderAssetsBackdrop}
        backgroundStyle={{ backgroundColor: theme.background }}
        handleIndicatorStyle={{
          backgroundColor: theme.borderLight,
          width: 40,
        }}
      >
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        >
          {tour.sessionActive &&
            (tour.step === Level1TourStep.SelectLivretAInSheet ||
              tour.step === Level1TourStep.SelectLivretAForWithdraw ||
              tour.step === Level1TourStep.WithdrawAndMoveToOtherLivret) && (
            <Level1TourCallout
              title={tourStepHeadline(tour.step)}
              message={tourBubbleForStep(tour.step, tour.eventPhase)}
            />
          )}
          {!tourRestrictsAssetPicker && (
            <>
              <View style={[styles.assetsSheetSearch, { backgroundColor: theme.card, borderColor: theme.borderLight }]}>
                <TextInput
                  style={[styles.assetsSheetSearchInput, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}
                  placeholder="Rechercher"
                  placeholderTextColor={theme.iconMuted}
                  value={assetsSearchQuery}
                  onChangeText={setAssetsSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={[styles.assetsSheetSectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                Trendings
              </Text>
              <View style={[styles.assetsSheetTabsBar, { backgroundColor: theme.card, borderColor: theme.borderLight }]}>
                <TouchableOpacity
                  style={[
                    styles.assetsSheetTab,
                    selectedSubmarketId === null && { backgroundColor: theme.accent },
                  ]}
                  onPress={() => setSelectedSubmarketId(null)}
                >
                  <Text style={[styles.assetsSheetTabText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                    Tous
                  </Text>
                </TouchableOpacity>
                {submarkets.map((sm) => (
                  <TouchableOpacity
                    key={sm.id}
                    style={[
                      styles.assetsSheetTab,
                      selectedSubmarketId === sm.id && { backgroundColor: theme.accent },
                    ]}
                    onPress={() => setSelectedSubmarketId(sm.id)}
                  >
                    <Text style={[styles.assetsSheetTabText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                      {sm.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Asset List */}
          {assetsLoading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 24 }} />
          ) : (
            assetsListForSheet.map((asset: any) => {
              const tourHighlightThisRow =
                tour.sessionActive &&
                ((tour.step === Level1TourStep.SelectLivretAInSheet &&
                  isLivretAAsset({ title: asset.title, symbol: asset.symbol })) ||
                  (tour.step === Level1TourStep.SelectLivretAForWithdraw &&
                    isLivretAAsset({ title: asset.title, symbol: asset.symbol })) ||
                  (tour.step === Level1TourStep.WithdrawAndMoveToOtherLivret &&
                    isSavingsLivretOtherThanA({
                      title: asset.title,
                      symbol: asset.symbol,
                      submarket: asset.submarket,
                    })));
              return (
              <TouchableOpacity
                key={asset.id}
                style={[
                  styles.assetsSheetRow,
                  {
                    backgroundColor: theme.card,
                    opacity: tourRestrictsAssetPicker && !tourHighlightThisRow ? 0.24 : 1,
                  },
                  tourHighlightThisRow && { borderWidth: 2, borderColor: theme.accent },
                ]}
                activeOpacity={0.7}
                disabled={
                  tour.sessionActive &&
                  ((tour.step === Level1TourStep.SelectLivretAInSheet &&
                    !isLivretAAsset({ title: asset.title, symbol: asset.symbol })) ||
                    (tour.step === Level1TourStep.SelectLivretAForWithdraw &&
                      !isLivretAAsset({ title: asset.title, symbol: asset.symbol })) ||
                    (tour.step === Level1TourStep.WithdrawAndMoveToOtherLivret &&
                      !isSavingsLivretOtherThanA({
                        title: asset.title,
                        symbol: asset.symbol,
                        submarket: asset.submarket,
                      })))
                }
                onPress={() => {
                  void (async () => {
                    const tu = tourRef.current;
                    if (tu.sessionActive && tu.step === Level1TourStep.SelectLivretAInSheet) {
                      if (!isLivretAAsset({ title: asset.title, symbol: asset.symbol })) return;
                      await tu.goToStep(Level1TourStep.DepositOnLivretA);
                    }
                    skipResumeOnCloseRef.current = true;
                    navigatedToAssetDetailRef.current = true;
                    assetsSheetRef.current?.dismiss();
                    router.push(`/game/asset-detail?id=${asset.id}&gameInstanceId=${gameInstanceId}&walletId=${walletId}`);
                  })();
                }}
              >
                <View style={styles.assetsSheetRowLeft}>
                  <View style={styles.assetsSheetRowTopLine}>
                    <Text style={[styles.assetsSheetRowName, { color: theme.text, fontFamily: 'Anybody' }]}>
                      {asset.title ?? asset.symbol ?? 'Asset'}
                    </Text>
                    <Text style={[styles.assetsSheetRowPrice, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                      {asset.maxAmount != null ? `${Number(asset.maxAmount).toLocaleString('fr-FR')}€` : (getAdjustedRate(asset.id, asset.rate) != null ? `${getAdjustedRate(asset.id, asset.rate)}%` : '—')}
                    </Text>
                  </View>
                  {asset.submarket?.title && (
                    <View style={[styles.assetsSheetBadge, { backgroundColor: getSubmarketBadgeStyle(asset.submarket.title).bg }]}>
                      <Text style={[styles.assetBadgeText, { color: getSubmarketBadgeStyle(asset.submarket.title).text }]}>
                        {asset.submarket.title}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              );
            })
          )}
          {!assetsLoading && assetsListForSheet.length === 0 && (
            <Text style={{ color: theme.text, fontFamily: CashouTheme.fonts.body, textAlign: 'center', marginTop: 24, opacity: 0.6 }}>
              Aucun asset trouvé
            </Text>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <Level1TourOverlay
        visible={tutorialOverlayVisible}
        message={tourBubbleForStep(tour.step, tour.eventPhase)}
        reserveBottomPx={bottomChromeHeight}
      />

      {/* Bottom Game Controls — rendered after overlay + higher z-index so buttons stay clear and tappable */}
      {!isGameEnded && (
        <View
          style={[
            styles.bottomControls,
            {
              paddingBottom: insets.bottom + 8,
              zIndex: 400,
              ...(Platform.OS === 'android' ? { elevation: 400 } : {}),
            },
          ]}
          onLayout={(e) => setBottomChromeHeight(e.nativeEvent.layout.height)}
        >
          {isInPreparation ? (
            <View style={styles.startButtonsContainer}>
              <ActionPillButton
                label="Investir"
                iconName="add"
                onPress={handleAddAsset}
                disabled={
                  tour.sessionActive &&
                  tour.step === Level1TourStep.CloseSheetAndPressStart
                }
                style={
                  tour.sessionActive &&
                  (tour.step === Level1TourStep.OpenInvestSheet ||
                    tour.step === Level1TourStep.PostEventOpenAssets)
                    ? tourFocusedPillStyle
                    : undefined
                }
              />
              <ActionPillButton
                label="Commencer"
                iconName="play"
                onPress={handleStartGame}
                isLoading={isStarting}
                disabled={
                  tour.sessionActive &&
                  (tour.step === Level1TourStep.OpenInvestSheet ||
                    tour.step === Level1TourStep.SelectLivretAInSheet ||
                    tour.step === Level1TourStep.DepositOnLivretA)
                }
                style={
                  tour.sessionActive && tour.step === Level1TourStep.CloseSheetAndPressStart
                    ? tourFocusedPillStyle
                    : undefined
                }
              />
            </View>
          ) : isAwaitingEventResume ? (
            <View style={styles.startButtonsContainer}>
              <ActionPillButton
                label="Investir"
                iconName="add"
                onPress={handleAddAsset}
                disabled={
                  tour.sessionActive &&
                  tour.step === Level1TourStep.CloseSheetAndPressStart
                }
                style={
                  tour.sessionActive &&
                  (tour.step === Level1TourStep.OpenInvestSheet ||
                    tour.step === Level1TourStep.PostEventOpenAssets)
                    ? tourFocusedPillStyle
                    : undefined
                }
              />
              <ActionPillButton
                label="Reprendre"
                iconName="play"
                onPress={handleResumeAfterEvent}
                isLoading={isStarting}
                disabled={
                  tour.sessionActive &&
                  tour.step !== Level1TourStep.FirstEventResume &&
                  tour.step !== Level1TourStep.PostEventResume
                }
                style={
                  tour.sessionActive &&
                  (tour.step === Level1TourStep.FirstEventResume ||
                    tour.step === Level1TourStep.PostEventResume)
                    ? tourFocusedPillStyle
                    : undefined
                }
              />
            </View>
          ) : hasGameStarted && isPaused && !isAssetsSheetOpen ? (
            <View style={styles.startButtonsContainer}>
              <ActionPillButton
                label="Investir"
                iconName="add"
                onPress={handleAddAsset}
                style={
                  tour.sessionActive &&
                  (tour.step === Level1TourStep.OpenInvestSheet ||
                    tour.step === Level1TourStep.PostEventOpenAssets)
                    ? tourFocusedPillStyle
                    : undefined
                }
              />
              <ActionPillButton
                label="Reprendre"
                iconName="play"
                onPress={handleManualResume}
                isLoading={isStarting}
                style={
                  tour.sessionActive &&
                  (tour.step === Level1TourStep.FirstEventResume ||
                    tour.step === Level1TourStep.PostEventResume)
                    ? tourFocusedPillStyle
                    : undefined
                }
              />
            </View>
          ) : (
            <ActionPillButton
              label="Investir"
              iconName="add"
              onPress={handleAddAsset}
              style={
                tour.sessionActive &&
                (tour.step === Level1TourStep.OpenInvestSheet ||
                  tour.step === Level1TourStep.PostEventOpenAssets)
                  ? tourFocusedPillStyle
                  : undefined
              }
            />
          )}
        </View>
      )}
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  portfolioCard: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
    marginBottom: 8,
  },
  portfolioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  portfolioLabel: {
    fontSize: 20,
    fontWeight: "600",
  },
  portfolioTotal: {
    fontSize: 24,
    fontWeight: "700",
  },
  portfolioSeparator: {
    height: 3,
    backgroundColor: "#CCCCCC",
    borderRadius: 2,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  assetRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 22,
    marginBottom: 8,
  },
  assetRowContent: {
    flexDirection: "column",
    gap: 8,
  },
  assetRowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assetRowName: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  assetBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  assetBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Anybody",
  },
  assetRowAmount: {
    fontSize: 22,
    fontWeight: "700",
  },
  assetRowBottomLine: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  assetRowPerfLine: {
    fontSize: 13,
    fontWeight: "600",
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  startButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  endGameBlur: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  endGameOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  endGameCardBackdrop: {
    width: "97%",
    maxWidth: 410,
    borderRadius: 36,
    padding: 6,
  },
  endGameCard: {
    width: "100%",
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  endGameTitle: {
    fontSize: 28,
    fontFamily: "Anybody",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  endGameMessage: {
    fontSize: 15,
    fontFamily: "Anybody",
    fontWeight: "normal",
    lineHeight: 20,
  },
  endGameSecondary: {
    marginTop: 9,
  },
  endGameTip: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: 'normal',
    lineHeight: 18,
    marginTop: 12,
    opacity: 1,
  },
  endGameStarsRow: {
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 30,
    backgroundColor: "#F7B167",
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  endGameActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  endGameActionButton: {},
  endGameSingleAction: {
    flex: 0,
    minWidth: 132,
  },
  // Assets Bottom Sheet styles
  assetsSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  assetsSheetTitle: {
    fontSize: 24,
  },
  assetsSheetCash: {
    fontSize: 20,
  },
  assetsSheetSearch: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 20,
  },
  assetsSheetSearchInput: {
    flex: 1,
    fontSize: 17,
    padding: 0,
  },
  assetsSheetSectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  assetsSheetTabsBar: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  assetsSheetTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  assetsSheetTabText: {
    fontSize: 14,
  },
  assetsSheetRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 22,
    marginBottom: 10,
  },
  assetsSheetRowLeft: {
    flexDirection: "column",
    gap: 8,
  },
  assetsSheetRowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assetsSheetRowName: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  assetsSheetBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
  },
  assetsSheetRowPrice: {
    fontSize: 22,
    fontWeight: "700",
  },
});

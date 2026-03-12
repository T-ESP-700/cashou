import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CashouTheme } from '@/constants/cashou-theme';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeader } from '@/hooks/use-header';
import { useNotifications } from '@/hooks/use-notifications';
import { LevelInfoModal } from '@/components/level-info-modal';
import { ActionPillButton, GoalStarIcon } from '@/components/ui';
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
const GAME_START_DATE = new Date('2024-01-01');
const UPDATE_INTERVAL_MS = 1000;

// Constantes pour l'animation visuelle de la date
const DAY_ANIMATION_MS = 30; // Vitesse par jour (30ms = très rapide)
const MONTH_PAUSE_MS = 150; // Pause supplémentaire au changement de mois

export default function GameCurrentScreen() {
  const { levelId, gameId } = useLocalSearchParams<{ levelId: string; gameId?: string }>();
  const { colors: theme, isDark } = useCashouTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { pendingEventCompletion, setPendingEventCompletion, isOnAssetsScreen, setActiveGameInstanceId, eventNotification } = useNotifications();
  const { setOptions: setHeaderOptions } = useHeader();

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
  const assetsSheetRef = useRef<BottomSheet>(null);
  const skipResumeOnCloseRef = useRef(false); // Don't resume game when closing sheet to navigate to asset-detail
  const navigatedToAssetDetailRef = useRef(false); // Track if we navigated away to asset-detail
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsSearchQuery, setAssetsSearchQuery] = useState('');
  const [selectedSubmarketId, setSelectedSubmarketId] = useState<number | null>(null);

  const [gameDate, setGameDate] = useState(GAME_START_DATE);
  const [gameTimeState, setGameTimeState] = useState<GameTimeState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false); // Animation en cours
  const [targetDate, setTargetDate] = useState<Date | null>(null); // Date cible pour l'animation
  const [isGameEnded, setIsGameEnded] = useState(false); // Partie terminée
  const [gameHasBeenStarted, setGameHasBeenStarted] = useState(false); // Le jeu a été démarré au moins une fois via start()

  // Game has started if start() was called at least once (not just created in preparation mode)
  const hasGameStarted = gameInstanceId !== null && gameHasBeenStarted;

  // Game is in preparation mode (instance created but not yet started via "Démarrer")
  const isInPreparation = gameInstanceId !== null && !gameHasBeenStarted && !isGameEnded;

  // Stats simulées pour la démo (à remplacer par de vraies données)
  const [stats, setStats] = useState<GameStats>({
    level: 1,
    cash: 1000,
    timePassed: '0m',
    successes: 0,
  });


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
      Alert.alert('Erreur', 'Impossible de terminer la partie');
    } finally {
      setIsEndingGame(false);
    }
  }, [gameInstanceId, isEndingGame, isGameEnded]);

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
      setHoldings((holdingsData as HoldingData[]) ?? []);

      // Load price-based portfolio values if wallet is available
      if (effectiveWalletId) {
        try {
          const portfolio = await trpcClient.investment.getPortfolio.query({
            walletId: effectiveWalletId,
            gameInstanceId: gInstanceId,
          });
          const values: Record<number, number> = {};
          for (const item of portfolio.items) {
            values[item.holding.assetId ?? 0] = Math.round(item.totalValue);
          }
          setHoldingValues(values);
        } catch (e) {
          console.error('Error fetching portfolio values:', e);
        }
      }
    } catch (err) {
      console.error('Error fetching holdings:', err);
      setHoldings([]);
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
                const wallets = await trpcClient.wallet.getByGameInstance.query({ gameInstanceId: gameInstance.id });
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
                Alert.alert(
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
  useEffect(() => {
    if (!isAnimating || !targetDate) return;

    let animationFrame: ReturnType<typeof setTimeout> | null = null;
    let currentDate = new Date(GAME_START_DATE);
    const target = new Date(targetDate);

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
      setGameDate(new Date(currentDate));

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

  // Quand la modale d'event demande d'ouvrir le sheet assets:
  // Compléter l'event SANS reprendre le jeu, puis ouvrir le bottom sheet.
  // Le jeu reste en pause tant que le sheet est ouvert (handleAssetsSheetChange gère le resume à la fermeture).
  useEffect(() => {
    if (!shouldOpenAssetsSheet) return;
    setShouldOpenAssetsSheet(false);

    const openAssetsFromEvent = async () => {
      if (pendingEventCompletion && gameInstanceId) {
        try {
          console.log('[GameCurrentScreen] 📋 Completing event and opening assets sheet (game stays paused)');
          await trpcClient.gameInstance.completeEvent.mutate({ id: gameInstanceId });
          console.log('[GameCurrentScreen] 📋 completeEvent done → re-pausing immediately');
          // completeEvent unpauses on backend → immediately re-pause
          await trpcClient.gameInstance.pause.mutate({ id: gameInstanceId });
          console.log('[GameCurrentScreen] 📋 re-pause done → game is paused');
          setPendingEventCompletion(null);

          // Resync game state (game is paused)
          const instance = await trpcClient.gameInstance.getById.query({ id: gameInstanceId });
          console.log('[GameCurrentScreen] 📋 backend state: isPaused=', instance?.isPaused, 'totalPausedDuration=', instance?.totalPausedDuration);
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
          setIsPaused(true);
        } catch (err) {
          console.error('[GameCurrentScreen] Error completing event for assets:', err);
        }
      }
      handleAddAsset();
    };

    openAssetsFromEvent();
  }, [shouldOpenAssetsSheet, pendingEventCompletion, gameInstanceId]);

  // Quand le modal d'event se ferme via "Continuer" (pendingEventCompletion set, pas sur assets),
  // compléter l'event immédiatement et reprendre la partie.
  // Skip si shouldOpenAssetsSheet est actif (le cas "Voir mes assets" est géré par l'effect ci-dessus).
  useEffect(() => {
    if (!pendingEventCompletion || !gameInstanceId || isOnAssetsScreen || shouldOpenAssetsSheet) return;
    if (pendingEventCompletion !== gameInstanceId) return;

    const completeAndResume = async () => {
      try {
        console.log('[GameCurrentScreen] ▶️ Completing event and resuming game', gameInstanceId);
        await trpcClient.gameInstance.completeEvent.mutate({ id: gameInstanceId });
        setPendingEventCompletion(null);

        // Resync game state from backend BEFORE unpausing to avoid stale totalPausedDuration
        // causing checkIfTimeElapsed to incorrectly end the game
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
      } catch (err) {
        console.error('[GameCurrentScreen] Error completing event:', err);
      }
    };

    completeAndResume();
  }, [pendingEventCompletion, gameInstanceId, isOnAssetsScreen, shouldOpenAssetsSheet, setPendingEventCompletion]);

  // Fetch triggered impacts on mount and when eventNotification changes
  useEffect(() => {
    if (!gameInstanceId) return;
    fetchTriggeredImpacts(gameInstanceId);
  }, [gameInstanceId, eventNotification, fetchTriggeredImpacts]);

  // Calculate initial game date whenever gameTimeState changes
  // This ensures the correct date is shown even when paused
  useEffect(() => {
    if (!gameTimeState) return;

    // Calculate and set the current game date
    const currentDate = calculateGameDate(gameTimeState);
    setGameDate(currentDate);
    console.log('[GameCurrentScreen] 📅 Initial date calculated:', currentDate.toLocaleDateString('fr-FR'));
  }, [gameTimeState, calculateGameDate]);

  // Backup event detection: periodically check backend for pending events during active gameplay.
  // This complements the NotificationProvider polling — if push or provider polling fails,
  // this ensures events are still detected while the game screen is active.
  useEffect(() => {
    if (!gameInstanceId || isPaused || isGameEnded || isEndingGame || eventNotification || pendingEventCompletion) return;

    const EVENT_CHECK_INTERVAL_MS = 5000;
    const eventCheckInterval = setInterval(() => {
      triggerPendingEventCheck();
    }, EVENT_CHECK_INTERVAL_MS);

    return () => clearInterval(eventCheckInterval);
  }, [gameInstanceId, isPaused, isGameEnded, isEndingGame, eventNotification, pendingEventCompletion, triggerPendingEventCheck]);

  // Animation locale de la date en temps réel (aucun appel backend)
  useEffect(() => {
    // Ne pas exécuter si on est en train d'animer ou si la partie est terminée
    if (!gameTimeState || isPaused || isAnimating || isGameEnded || isEndingGame) return;

    // Vérifier immédiatement si le temps est écoulé
    if (checkIfTimeElapsed(gameTimeState)) {
      handleGameEnd();
      return;
    }

    // Mise à jour immédiate
    setGameDate(calculateGameDate(gameTimeState));

    // Puis toutes les secondes
    const interval = setInterval(() => {
      // Vérifier si le temps est écoulé à chaque tick
      if (checkIfTimeElapsed(gameTimeState)) {
        clearInterval(interval);
        handleGameEnd();
        return;
      }
      setGameDate(calculateGameDate(gameTimeState));
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gameTimeState, isPaused, isAnimating, isGameEnded, isEndingGame, isOnAssetsScreen, calculateGameDate, checkIfTimeElapsed, handleGameEnd]);

  // Resynchronisation quand on revient sur la page (sans animation)
  useFocusEffect(
    useCallback(() => {
      if (!gameInstanceId) return;

      const resync = async () => {
        try {
          console.log('[GameCurrentScreen] 🔄 Resyncing game state for gameInstanceId:', gameInstanceId);

          // If returning from asset-detail, resume the game first
          if (navigatedToAssetDetailRef.current) {
            console.log('[GameCurrentScreen] 🔄 Returning from asset-detail → resuming game');
            navigatedToAssetDetailRef.current = false;
            try {
              await trpcClient.gameInstance.resume.mutate({ id: gameInstanceId });
            } catch (err) {
              console.error('[GameCurrentScreen] Error resuming after asset-detail:', err);
            }
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

            if (wasPaused && !nowPaused) {
              console.log('[GameCurrentScreen] ✅ Game was resumed, state updated');
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
    }, [gameInstanceId, calculateEndDate, isPaused, walletId])
  );

  // Configure header: static options on focus
  useFocusEffect(
    useCallback(() => {
      setHeaderOptions({
        showBackButton: true,
        title: `Niveau ${stats.level}`,
        onTitlePress: isGameEnded ? undefined : () => setShowLevelInfoModal(true),
      });
    }, [setHeaderOptions, stats.level, isGameEnded])
  );

  // Configure header: dynamic subtitle (date + game state)
  useEffect(() => {
    if (isGameEnded) {
      setHeaderOptions({
        subtitle: undefined,
        onTitlePress: undefined,
      });
    } else {
      const statusIcon = isPaused ? '' : ' ►';
      setHeaderOptions({
        subtitle: gameInstanceId ? `${formatDate(gameDate)}${statusIcon}` : undefined,
      });
    }
  }, [gameDate, isPaused, isGameEnded, gameInstanceId, setHeaderOptions]);

  // Auto-show level info modal for new games (when no gameId is passed)
  useEffect(() => {
    // Only show once per session, only for new games, and only after level data is loaded
    if (!gameId && levelData?.level && !isLoading && !hasShownLevelInfoRef.current) {
      hasShownLevelInfoRef.current = true;
      setShowLevelInfoModal(true);
    }
  }, [gameId, levelData, isLoading]);

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

  const handleOpenRecap = () => {
    if (!gameInstanceId) return;
    setShowEndGameModal(false);
    router.replace({
      pathname: '/(tabs)/summary',
      params: { gameId: gameInstanceId.toString() },
    });
  };

  const handleOpenQuiz = () => {
    if (!endGameResult?.success) return;
    if (!levelQuizId) {
      Alert.alert('Quiz indisponible', 'Aucun quiz n’est associé à ce niveau pour le moment.');
      return;
    }
    setShowEndGameModal(false);
    router.push({
      pathname: '/(tabs)/daily-quiz',
      params: {
        quizId: levelQuizId.toString(),
        gameInstanceId: gameInstanceId ? gameInstanceId.toString() : '',
      },
    });
  };

  const handleReplay = async () => {
    if (!user?.id || !levelData?.level?.id) return;

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
      router.replace({
        pathname: '/game/current',
        params: {
          gameId: String(newGame.id),
          levelId: String(levelData.level.id),
        },
      });

      setGameInstanceId(newGame.id);
      setWalletId(wallet.id);
      setIsPaused(true);
      setIsGameEnded(false);
      setEndGameResult(null);
      setGameTimeState(null);
      setGameDate(GAME_START_DATE);
      setHoldings([]);
      setStats((prev) => ({
        ...prev,
        cash: startBalance,
        timePassed: '0m',
      }));
    } catch (err) {
      console.error('Error creating replay game:', err);
      Alert.alert('Erreur', 'Impossible de créer la partie');
    } finally {
      setIsReplayCreating(false);
    }
  };

  // Fetch all assets for the bottom sheet
  const fetchAllAssets = useCallback(async () => {
    try {
      setAssetsLoading(true);
      const data = await trpcClient.asset.getAll.query();
      setAllAssets(data as any[]);
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  // Fetch all assets on mount for submarket badges
  useEffect(() => {
    if (gameInstanceId) {
      fetchAllAssets();
    }
  }, [gameInstanceId, fetchAllAssets]);

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
    const holdingsTotal = holdings.reduce((sum, h) => sum + Number(h.quantity ?? 0), 0);
    return Math.round(stats.cash + holdingsTotal);
  }, [stats.cash, holdings]);

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
        setAssetsSearchQuery('');
        setSelectedSubmarketId(null);
      }
      return;
    }
    try {
      if (index >= 0) {
        // Game is already paused by handleAddAsset or openAssetsFromEvent before expanding.
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
        // Reset search and filter when closing
        setAssetsSearchQuery('');
        setSelectedSubmarketId(null);
      }
    } catch (err) {
      console.error('Error pausing/resuming game from assets sheet:', err);
    }
  }, [gameInstanceId, gameHasBeenStarted, isPaused]);

  const handleAddAsset = async () => {
    if (!gameInstanceId || !walletId) {
      Alert.alert('Erreur', 'Initialisation en cours, veuillez patienter...');
      return;
    }
    // Pause the game immediately before opening the sheet to avoid race conditions
    // (the onChange callback would pause too, but asynchronously during animation)
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
      fetchAllAssets();
    }
    assetsSheetRef.current?.expand();
  };

  const handleHoldingPress = async (holding: HoldingData) => {
    if (!gameInstanceId || !walletId || !holding.asset) return;
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
      Alert.alert('Erreur', 'Instance de jeu non trouvée');
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
    } catch (err) {
      console.error('Error starting game:', err);
      Alert.alert('Erreur', 'Impossible de demarrer la partie');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartGame = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez etre connecte pour jouer');
      return;
    }

    if (!gameInstanceId) {
      Alert.alert('Erreur', 'Initialisation en cours, veuillez patienter...');
      return;
    }

    // Vérifier si des investissements ont été faits
    if (holdings.length === 0) {
      setShowNoInvestmentModal(true);
      return;
    }

    // Des investissements existent, démarrer directement
    await startGameNow();
  };

  // Confirmation pour démarrer sans investissement
  const handleConfirmStartWithoutInvestment = async () => {
    setShowNoInvestmentModal(false);
    await startGameNow();
  };

  const handleResetLevel = async () => {
    if (!user || !levelId) return;

    Alert.alert(
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
              Alert.alert('Succes', 'Le niveau a ete reinitialise. Vous pouvez recommencer !');
            } catch (err) {
              console.error('Error resetting level:', err);
              Alert.alert('Erreur', 'Impossible de reinitialiser le niveau');
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
              Portefeuille
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
                    {Math.round(Number(holding.quantity ?? 0)).toLocaleString('fr-FR')}€
                  </Text>
                </View>
                {badgeStyle && (
                  <View style={[styles.assetBadge, { backgroundColor: badgeStyle.bg }]}>
                    <Text style={[styles.assetBadgeText, { color: badgeStyle.text }]}>
                      {submarketTitle}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Game Controls */}
      {!isGameEnded && (
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 8 }]}>
          {isInPreparation ? (
            <View style={styles.startButtonsContainer}>
              <ActionPillButton
                label="Investir"
                iconName="add"
                onPress={handleAddAsset}
                style={{ flex: 0, paddingHorizontal: 24, maxWidth: undefined }}
              />
              <ActionPillButton
                label="Commencer"
                iconName="play"
                onPress={handleStartGame}
                isLoading={isStarting}
                style={{ flex: 0, paddingHorizontal: 24, maxWidth: undefined }}
              />
            </View>
          ) : (
            <ActionPillButton
              label="Investir"
              iconName="add"
              onPress={handleAddAsset}
              style={{ flex: 0, paddingHorizontal: 28, maxWidth: undefined }}
            />
          )}
        </View>
      )}

      {/* Modal de confirmation si aucun investissement */}
      <Modal
        visible={showNoInvestmentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoInvestmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
              Aucun investissement
            </Text>
            <Text style={[styles.modalMessage, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
              {"Vous n'avez fait aucun investissement. Si vous demarrez maintenant, vous ne pourrez pas gagner d'argent pendant la partie."}
            </Text>
            <Text style={[styles.modalMessage, { fontFamily: CashouTheme.fonts.body, color: theme.text, marginTop: 8 }]}>
              Voulez-vous vraiment demarrer sans investir ?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: theme.border }]}
                onPress={() => setShowNoInvestmentModal(false)}
              >
                <Text style={[styles.modalButtonText, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
                  {"Investir d'abord"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: theme.accent }]}
                onPress={handleConfirmStartWithoutInvestment}
              >
                <Text style={[styles.modalButtonText, { fontFamily: CashouTheme.fonts.body, color: '#FFFFFF' }]}>
                  Demarrer quand meme
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modale de fin de partie */}
      <Modal
        visible={showEndGameModal}
        transparent
        animationType="fade"
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
                    onPress={handleOpenRecap}
                    style={styles.endGameActionButton}
                  />
                  <ActionPillButton
                    label="Quiz"
                    customIcon={<QuizActionIcon width={18} height={18} />}
                    onPress={handleOpenQuiz}
                    style={styles.endGameActionButton}
                  />
                </>
              ) : (
                <ActionPillButton
                  label="Rejouer"
                  iconName="refresh-outline"
                  onPress={handleReplay}
                  disabled={isReplayCreating}
                  isLoading={isReplayCreating}
                  style={StyleSheet.flatten([styles.endGameActionButton, styles.endGameSingleAction])}
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
      <BottomSheet
        ref={assetsSheetRef}
        index={-1}
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
          {/* Search */}
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

          {/* Submarket Tabs */}
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
              <Text style={[styles.assetsSheetTabText, { color: selectedSubmarketId === null ? '#FFFFFF' : theme.text, fontFamily: CashouTheme.fonts.body }]}>
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
                <Text style={[styles.assetsSheetTabText, { color: selectedSubmarketId === sm.id ? '#FFFFFF' : theme.text, fontFamily: CashouTheme.fonts.body }]}>
                  {sm.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Asset List */}
          {assetsLoading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 24 }} />
          ) : (
            filteredAssets.map((asset: any) => (
              <TouchableOpacity
                key={asset.id}
                style={[styles.assetsSheetRow, { backgroundColor: theme.card }]}
                activeOpacity={0.7}
                onPress={() => {
                  skipResumeOnCloseRef.current = true;
                  navigatedToAssetDetailRef.current = true;
                  assetsSheetRef.current?.close();
                  router.push(`/game/asset-detail?id=${asset.id}&gameInstanceId=${gameInstanceId}&walletId=${walletId}`);
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
            ))
          )}
          {!assetsLoading && filteredAssets.length === 0 && (
            <Text style={{ color: theme.text, fontFamily: CashouTheme.fonts.body, textAlign: 'center', marginTop: 24, opacity: 0.6 }}>
              Aucun asset trouvé
            </Text>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  portfolioCard: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
    marginBottom: 8,
  },
  portfolioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  portfolioLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  portfolioTotal: {
    fontSize: 24,
    fontWeight: '700',
  },
  portfolioSeparator: {
    height: 3,
    backgroundColor: '#3A3A3A',
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
    flexDirection: 'column',
    gap: 8,
  },
  assetRowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetRowName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  assetBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  assetBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Anybody',
  },
  assetRowAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  startButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 2,
  },
  modalButtonConfirm: {
  },
  modalButtonText: {
    fontSize: 14,
  },
  endGameBlur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  endGameOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  endGameCardBackdrop: {
    width: '97%',
    maxWidth: 410,
    borderRadius: 36,
    padding: 6,
  },
  endGameCard: {
    width: '100%',
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
    fontFamily: 'Anybody',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  endGameMessage: {
    fontSize: 15,
    fontFamily: 'Anybody',
    fontWeight: 'normal',
    lineHeight: 20,
  },
  endGameSecondary: {
    marginTop: 9,
  },
  endGameStarsRow: {
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 30,
    backgroundColor: '#F7B167',
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  endGameActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  endGameActionButton: {
  },
  endGameSingleAction: {
    flex: 0,
    minWidth: 132,
  },
  // Assets Bottom Sheet styles
  assetsSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  assetsSheetTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'column',
    gap: 8,
  },
  assetsSheetRowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetsSheetRowName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  assetsSheetBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
  },
  assetsSheetRowPrice: {
    fontSize: 22,
    fontWeight: '700',
  },
});

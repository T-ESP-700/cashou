import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme, Alert, Modal } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import { useNotifications } from '@/hooks/use-notifications';
import { LevelInfoModal } from '@/components/level-info-modal';
import FastForwardIcon from '@/assets/images/fast-forward.svg';
import PauseIcon from '@/assets/images/pause.svg';
import StopIcon from '@/assets/images/stop.svg';

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

// Constantes pour l'animation de la date
const GAME_START_DATE = new Date('2024-01-01');
const UPDATE_INTERVAL_MS = 1000;

// Constantes pour l'animation visuelle de la date
const DAY_ANIMATION_MS = 30; // Vitesse par jour (30ms = très rapide)
const MONTH_PAUSE_MS = 150; // Pause supplémentaire au changement de mois

export default function GameCurrentScreen() {
  const { levelId, gameId } = useLocalSearchParams<{ levelId: string; gameId?: string }>();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { pendingEventCompletion, setPendingEventCompletion, isOnAssetsScreen, setActiveGameInstanceId, eventNotification } = useNotifications();
  // Configure header for this screen
  useHeaderOptions({ showBackButton: true });

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
  const [showNoInvestmentModal, setShowNoInvestmentModal] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [showLevelInfoModal, setShowLevelInfoModal] = useState(false);
  const hasShownLevelInfoRef = useRef(false);

  // Mode dev (a configurer selon l'environnement)
  const __DEV__ = process.env.NODE_ENV === 'development' || true; // Force true pour le dev
  const [gameDate, setGameDate] = useState(GAME_START_DATE);
  const [gameTimeState, setGameTimeState] = useState<GameTimeState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false); // Animation en cours
  const [targetDate, setTargetDate] = useState<Date | null>(null); // Date cible pour l'animation
  const [isGameEnded, setIsGameEnded] = useState(false); // Partie terminée

  // Game has started if we have a game instance ID AND the timer is running (not paused)
  const hasGameStarted = gameInstanceId !== null && !isPaused;

  // Game is in preparation mode (instance created but not yet started)
  const isInPreparation = gameInstanceId !== null && isPaused && !isGameEnded;

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
      console.log('Game time elapsed, ending game...');

      // Appeler le backend pour terminer la partie
      await trpcClient.gameInstance.endGame.mutate({ id: gameInstanceId });

      // Mettre à jour l'état local
      setIsGameEnded(true);
      // La redirection vers summary sera déclenchée par le useEffect qui surveille isGameEnded
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

  // Helper function to load holdings for a game instance
  const loadHoldings = async (gInstanceId: number) => {
    try {
      const holdingsData = await trpcClient.holding.getByGameInstance.query({ gameInstanceId: gInstanceId });
      setHoldings((holdingsData as HoldingData[]) ?? []);
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
              try {
                const wallets = await trpcClient.wallet.getByGameInstance.query({ gameInstanceId: gameInstance.id });
                if (wallets && wallets.length > 0) {
                  setWalletId(wallets[0].id);
                  await loadWalletBalance(wallets[0].id);
                }
              } catch (walletErr) {
                console.error('Error fetching wallet:', walletErr);
              }

              // Load holdings
              await loadHoldings(gameInstance.id);

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

  // Calculate initial game date whenever gameTimeState changes
  // This ensures the correct date is shown even when paused
  useEffect(() => {
    if (!gameTimeState) return;

    // Calculate and set the current game date
    const currentDate = calculateGameDate(gameTimeState);
    setGameDate(currentDate);
    console.log('[GameCurrentScreen] 📅 Initial date calculated:', currentDate.toLocaleDateString('fr-FR'));
  }, [gameTimeState, calculateGameDate]);

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

  // Redirection vers l'écran de résumé quand la partie est terminée
  useEffect(() => {
    console.log('[GameCurrentScreen] 🎯 Redirect effect check: isGameEnded=', isGameEnded, 'gameInstanceId=', gameInstanceId);
    if (isGameEnded && gameInstanceId) {
      console.log('[GameCurrentScreen] 🚀 Redirecting to summary for game', gameInstanceId);
      // Rediriger vers l'écran de résumé
      router.replace({
        pathname: '/(tabs)/summary',
        params: { gameId: gameInstanceId.toString() },
      });
    }
  }, [isGameEnded, gameInstanceId, router]);

  // Auto-show level info modal for new games (when no gameId is passed)
  useEffect(() => {
    // Only show once per session, only for new games, and only after level data is loaded
    if (!gameId && levelData?.level && !isLoading && !hasShownLevelInfoRef.current) {
      hasShownLevelInfoRef.current = true;
      setShowLevelInfoModal(true);
    }
  }, [gameId, levelData, isLoading]);

  const handleAddAsset = () => {
    if (!gameInstanceId || !walletId) {
      Alert.alert('Erreur', 'Initialisation en cours, veuillez patienter...');
      return;
    }
    router.push({
      pathname: '/game/assets',
      params: {
        gameInstanceId: gameInstanceId.toString(),
        walletId: walletId.toString(),
      },
    });
  };

  const handleHoldingPress = (holding: HoldingData) => {
    if (!gameInstanceId || !walletId || !holding.asset) return;
    // Naviguer vers la fiche détaillée de l'asset
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
              Niveau {stats.level}
            </Text>
            <TouchableOpacity
              style={[styles.infoButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setShowLevelInfoModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.separator, { backgroundColor: theme.text }]} />

          {/* Statistics Section */}
          <Text style={[styles.sectionTitle, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            Statistiques
          </Text>

          <View style={styles.statsGrid}>
            {/* Level */}
            <View style={styles.statCardWrapper}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
                  Niveau
                </Text>
                <Text style={[styles.statValue, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
                  {stats.level}
                </Text>
              </View>
            </View>

            {/* Cash */}
            <View style={styles.statCardWrapper}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
                  Cash
                </Text>
                <Text style={[styles.statValue, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
                  {stats.cash}€
                </Text>
              </View>
            </View>

            {/* Time Passed */}
            <View style={styles.statCardWrapper}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
                  Temps passé
                </Text>
                <Text style={[styles.statValue, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
                  {stats.timePassed}
                </Text>
              </View>
            </View>

            {/* Successes */}
            <View style={styles.statCardWrapper}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
                  Réussites
                </Text>
                <Text style={[styles.statValue, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
                  {stats.successes}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: theme.text, marginTop: 16 }]} />

          {/* Assets Section */}
          <Text style={[styles.sectionTitle, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            List des assets
          </Text>

          <View style={styles.assetsGrid}>
            {/* Add Asset Button */}
            <View style={styles.assetCardWrapper}>
              <TouchableOpacity
                style={[styles.assetCard, styles.addAssetCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleAddAsset}
                activeOpacity={0.8}
              >
                <Text style={[styles.addAssetIcon, { color: theme.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Holding Cards */}
            {holdings.map((holding) => (
              <View key={holding.id} style={styles.assetCardWrapper}>
                <TouchableOpacity
                  style={[styles.assetCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleHoldingPress(holding)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.assetTitle, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
                    {holding.asset?.title ?? 'Asset'}
                  </Text>
                  <Text style={[styles.holdingQuantity, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
                    {Number(holding.quantity ?? 0).toFixed(2)}€
                  </Text>
                  <View style={styles.assetRateContainer}>
                    <Text style={[styles.assetRateArrow, { color: (holding.asset?.rate ?? 0) >= 0 ? '#4CAF50' : '#F44336' }]}>
                      {(holding.asset?.rate ?? 0) >= 0 ? '▲' : '▼'}
                    </Text>
                    <Text style={[styles.assetRate, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
                      {holding.asset?.rate ?? 0}%
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Game Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom }]}>
        {!hasGameStarted ? (
          // Boutons avant que le jeu ne commence
          <View style={styles.startButtonsContainer}>
            <TouchableOpacity
              style={[
                {
                  ...CashouTheme.button.primary,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: isStarting ? 0.6 : 1,
                  minWidth: 140,
                }
              ]}
              onPress={handleStartGame}
              activeOpacity={CashouTheme.button.primary.activeOpacity}
              disabled={isStarting}
            >
              {isStarting ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <Text style={[
                  {
                    ...CashouTheme.button.primary.text,
                    fontFamily: CashouTheme.fonts.subheading,
                    color: theme.text,
                  }
                ]}>
                  Demarrer
                </Text>
              )}
            </TouchableOpacity>

            {/* Bouton Reset (dev only) */}
            {__DEV__ && (
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  {
                    backgroundColor: '#FF5252',
                    opacity: isResetting ? 0.6 : 1,
                  }
                ]}
                onPress={handleResetLevel}
                activeOpacity={0.8}
                disabled={isResetting}
              >
                {isResetting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.resetButtonText}>Reset</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (

            <View style={[styles.dateContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {isGameEnded ? (
                <StopIcon width={28} height={28} stroke={theme.text} />
              ) : isPaused ? (
                <PauseIcon width={28} height={28} stroke={theme.text} />
              ) : (
                <FastForwardIcon width={28} height={28} fill={theme.text} />
              )}
              <Text style={[styles.dateText, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
                {formatDate(gameDate)}
              </Text>
            </View>
        )}
      </View>

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
              Vous n'avez fait aucun investissement. Si vous demarrez maintenant, vous ne pourrez pas gagner d'argent pendant la partie.
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
                  Investir d'abord
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

      {/* Modal d'informations du niveau */}
      <LevelInfoModal
        visible={showLevelInfoModal}
        onClose={() => setShowLevelInfoModal(false)}
        level={levelData?.level ? {
          ...levelData.level,
          description: levelData.level.description ?? null,
        } : null}
        goals={levelData?.goals ?? []}
      />
    </View>
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
  card: {
    flex: 1,
    marginBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 2,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCardWrapper: {
    width: '50%',
    padding: 6,
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 32,
    textAlign: 'center',
  },
  assetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  assetCardWrapper: {
    width: '50%',
    padding: 6,
  },
  assetCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    height: 120,
  },
  addAssetCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAssetIcon: {
    fontSize: 48,
    fontWeight: '300',
  },
  assetTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  holdingQuantity: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  assetRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetRateArrow: {
    fontSize: 20,
    marginRight: 4,
  },
  assetRate: {
    fontSize: 24,
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
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateContainer: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 2,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    fontSize: 18,
  },
  startButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
});

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme, Alert, Modal } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpc } from '@/lib/trpc';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import { useNotifications } from '@/hooks/use-notifications';
import {
  useGameInstance,
  useGameHoldings,
  useGameWallet,
  useLevelSummary,
  useStartGame,
  useEndGame,
  useCreateGameInstance,
  useCreateWallet,
  useResetLevel,
} from '@/hooks/use-game';
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

interface GameTimeState {
  createdAt: Date;
  totalPausedDuration: number;
  duration: number;
  speed: number;
  isEnded: boolean;
  isPaused: boolean;
  pausedAt: Date | null;
}

// Constants
const GAME_START_DATE = new Date('2024-01-01');
const UPDATE_INTERVAL_MS = 1000;
const DAY_ANIMATION_MS = 30;
const MONTH_PAUSE_MS = 150;

export default function GameCurrentScreen() {
  const { levelId, gameId } = useLocalSearchParams<{ levelId: string; gameId?: string }>();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pendingEventCompletion, setPendingEventCompletion, setActiveGameInstanceId, eventNotification } = useNotifications();

  useHeaderOptions({ showBackButton: true });

  // Local state
  const [gameInstanceId, setGameInstanceId] = useState<number | null>(gameId ? parseInt(gameId, 10) : null);
  const [walletId, setWalletId] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showNoInvestmentModal, setShowNoInvestmentModal] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [showLevelInfoModal, setShowLevelInfoModal] = useState(false);
  const hasShownLevelInfoRef = useRef(false);
  const [gameDate, setGameDate] = useState(GAME_START_DATE);
  const [gameTimeState, setGameTimeState] = useState<GameTimeState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const __DEV__ = process.env.NODE_ENV === 'development' || true;

  const [stats, setStats] = useState<GameStats>({
    level: 1,
    cash: 1000,
    timePassed: '0m',
    successes: 0,
  });

  // ============ QUERIES ============

  // Fetch level data
  const {
    data: levelData,
    isLoading: isLoadingLevel,
  } = useLevelSummary(levelId ? parseInt(levelId) : null);

  // Fetch game instance (when we have an ID)
  const {
    data: gameInstanceData,
    isLoading: isLoadingGameInstance,
    refetch: refetchGameInstance,
  } = useGameInstance(gameInstanceId);

  // Fetch holdings
  const {
    data: holdingsData,
    refetch: refetchHoldings,
  } = useGameHoldings(gameInstanceId);

  const holdings = useMemo(() => {
    if (!holdingsData) return [];
    return holdingsData.map((h: any) => ({
      id: h.id,
      quantity: h.quantity,
      asset: h.asset,
    }));
  }, [holdingsData]);

  // Fetch wallet (when we have walletId)
  const {
    data: walletData,
    refetch: refetchWallet,
  } = useGameWallet(walletId);

  // Update cash when wallet changes
  useEffect(() => {
    if (walletData?.amount) {
      setStats(prev => ({ ...prev, cash: Number(walletData.amount) }));
    }
  }, [walletData]);

  // ============ MUTATIONS ============

  const startGameMutation = useStartGame();
  const endGameMutation = useEndGame();
  const createGameInstanceMutation = useCreateGameInstance();
  const createWalletMutation = useCreateWallet();
  const resetLevelMutation = useResetLevel();

  // ============ COMPUTED VALUES ============

  const hasGameStarted = gameInstanceId !== null && !isPaused;
  const isInPreparation = gameInstanceId !== null && isPaused && !isGameEnded;
  const isLoading = isLoadingLevel || (gameId && isLoadingGameInstance);

  // ============ HELPER FUNCTIONS ============

  const calculateEndDate = useCallback((duration: number): Date => {
    const endDate = new Date(GAME_START_DATE);
    endDate.setDate(endDate.getDate() + duration);
    return endDate;
  }, []);

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

  const calculateGameDate = useCallback((timeState: GameTimeState): Date => {
    if (timeState.isEnded) {
      return calculateEndDate(timeState.duration);
    }

    const now = Date.now();
    const startTime = timeState.createdAt.getTime();

    let elapsedSeconds = Math.floor((now - startTime) / 1000);
    elapsedSeconds -= timeState.totalPausedDuration;

    if (timeState.isPaused && timeState.pausedAt) {
      const currentPauseDuration = Math.floor((now - timeState.pausedAt.getTime()) / 1000);
      elapsedSeconds -= currentPauseDuration;
    }

    elapsedSeconds = Math.max(0, elapsedSeconds);

    const totalDurationSeconds = (timeState.duration / timeState.speed) * 86400;
    const progressPercent = Math.min(100, (elapsedSeconds / totalDurationSeconds) * 100);
    const gameDaysElapsed = (timeState.duration * progressPercent) / 100;

    const gDate = new Date(GAME_START_DATE);
    gDate.setDate(gDate.getDate() + Math.floor(gameDaysElapsed));
    return gDate;
  }, [calculateEndDate]);

  // ============ GAME ACTIONS ============

  const handleGameEnd = useCallback(async () => {
    if (!gameInstanceId || isEndingGame || isGameEnded) return;

    try {
      setIsEndingGame(true);
      console.log('Game time elapsed, ending game...');

      await endGameMutation.mutateAsync({ id: gameInstanceId });
      setIsGameEnded(true);
    } catch (err) {
      console.error('Error ending game:', err);
      Alert.alert('Erreur', 'Impossible de terminer la partie');
    } finally {
      setIsEndingGame(false);
    }
  }, [gameInstanceId, isEndingGame, isGameEnded, endGameMutation]);

  const createGameInstanceForPreparation = async () => {
    if (!user || !levelId || !levelData?.level) return null;

    try {
      setIsInitializing(true);

      const gameInstance = await createGameInstanceMutation.mutateAsync({
        levelId: parseInt(levelId, 10),
        userId: user.id,
        startBalance: levelData.level.startBalance,
        isPaused: true,
        actionRequired: false,
      });

      const wallet = await createWalletMutation.mutateAsync({
        userId: user.id,
        gameInstanceId: gameInstance.id,
        amount: levelData.level.startBalance ?? 1000,
      });

      setGameInstanceId(gameInstance.id);
      setWalletId(wallet.id);
      setIsPaused(true);
      setIsGameEnded(false);

      return { gameInstance, wallet };
    } catch (err) {
      console.error('Error creating game instance for preparation:', err);
      return null;
    } finally {
      setIsInitializing(false);
    }
  };

  // ============ EFFECTS ============

  // Initialize game from params or create new instance
  useEffect(() => {
    const initializeGame = async () => {
      if (!levelId && !gameId) return;

      // If we have a gameId, the query will fetch it
      if (gameId) {
        const gInstanceId = parseInt(gameId, 10);
        setGameInstanceId(gInstanceId);
        setActiveGameInstanceId(gInstanceId);
      }
    };

    initializeGame();
  }, [levelId, gameId, setActiveGameInstanceId]);

  // Process game instance data when it arrives
  useEffect(() => {
    if (!gameInstanceData) return;

    const instance = gameInstanceData as any;
    setIsPaused(instance.isPaused ?? true);
    setIsGameEnded(instance.isEnded ?? false);

    // Get wallet ID from game instance
    if (instance.wallets && instance.wallets.length > 0) {
      setWalletId(instance.wallets[0].id);
    }

    // Update stats from level
    if (instance.level) {
      setStats(prev => ({
        ...prev,
        level: instance.level?.number || 1,
        cash: instance.level?.startBalance || 1000,
      }));

      // Initialize game time state
      const duration = instance.level.duration ?? 30;
      const speed = instance.level.speed ?? 1;
      const isEnded = instance.isEnded ?? false;

      const newTimeState: GameTimeState = {
        createdAt: new Date(instance.createdAt),
        totalPausedDuration: instance.totalPausedDuration ?? 0,
        duration,
        speed,
        isEnded,
        isPaused: instance.isPaused ?? false,
        pausedAt: instance.pausedAt ? new Date(instance.pausedAt) : null,
      };
      setGameTimeState(newTimeState);

      // Calculate target date for animation
      if (isEnded) {
        setGameDate(calculateEndDate(duration));
      } else {
        const target = calculateGameDate(newTimeState);
        if (target.getTime() > GAME_START_DATE.getTime()) {
          setTargetDate(target);
          setGameDate(new Date(GAME_START_DATE));
          setIsAnimating(true);
        } else {
          setGameDate(target);
        }
      }
    }
  }, [gameInstanceData, calculateEndDate, calculateGameDate]);

  // Create game instance if we have level data but no game
  useEffect(() => {
    if (levelData?.level && !gameId && !gameInstanceId && user && !isInitializing) {
      createGameInstanceForPreparation();
    }
  }, [levelData, gameId, gameInstanceId, user, isInitializing]);

  // Update stats from level data
  useEffect(() => {
    if (levelData?.level) {
      setStats(prev => ({
        ...prev,
        level: levelData.level?.number || 1,
        cash: levelData.level?.startBalance || 1000,
      }));
    }
  }, [levelData]);

  // Animation effect
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

      const currentMonth = currentDate.getMonth();
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextMonth = nextDate.getMonth();
      const isMonthChange = currentMonth !== nextMonth;

      currentDate = nextDate;
      setGameDate(new Date(currentDate));

      const delay = isMonthChange ? MONTH_PAUSE_MS : DAY_ANIMATION_MS;
      animationFrame = setTimeout(animate, delay);
    };

    animationFrame = setTimeout(animate, DAY_ANIMATION_MS);

    return () => {
      if (animationFrame) clearTimeout(animationFrame);
    };
  }, [isAnimating, targetDate]);

  // Force pause when event notification
  useEffect(() => {
    if (!gameInstanceId || !eventNotification) return;

    console.log('[GameCurrentScreen] Forcing pause due to event notification');
    setIsPaused(true);

    // Sync from backend
    refetchGameInstance();
  }, [eventNotification, gameInstanceId, refetchGameInstance]);

  // Update game date when time state changes
  useEffect(() => {
    if (!gameTimeState) return;
    const currentDate = calculateGameDate(gameTimeState);
    setGameDate(currentDate);
  }, [gameTimeState, calculateGameDate]);

  // Real-time date progression
  useEffect(() => {
    if (!gameTimeState || isPaused || isAnimating || isGameEnded || isEndingGame) return;

    if (checkIfTimeElapsed(gameTimeState)) {
      handleGameEnd();
      return;
    }

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
  }, [gameTimeState, isPaused, isAnimating, isGameEnded, isEndingGame, calculateGameDate, checkIfTimeElapsed, handleGameEnd]);

  // Resync on focus
  useFocusEffect(
    useCallback(() => {
      if (!gameInstanceId) return;

      const resync = async () => {
        await new Promise(resolve => setTimeout(resolve, 400));

        const result = await refetchGameInstance();
        const instance = result.data as any;

        if (instance?.level) {
          const isEnded = instance.isEnded ?? false;
          const nowPaused = instance.isPaused ?? false;

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

          if (isEnded) {
            const duration = instance.level.duration ?? 30;
            setGameDate(calculateEndDate(duration));
          }
        }

        refetchHoldings();
        refetchWallet();
      };

      resync();
    }, [gameInstanceId, calculateEndDate, refetchGameInstance, refetchHoldings, refetchWallet])
  );

  // Redirect when game ended
  useEffect(() => {
    if (isGameEnded && gameInstanceId) {
      router.replace({
        pathname: '/(tabs)/summary',
        params: { gameId: gameInstanceId.toString() },
      });
    }
  }, [isGameEnded, gameInstanceId]);

  // Auto-show level info for new games
  useEffect(() => {
    if (!gameId && levelData?.level && !isLoading && !hasShownLevelInfoRef.current) {
      hasShownLevelInfoRef.current = true;
      setShowLevelInfoModal(true);
    }
  }, [gameId, levelData, isLoading]);

  // ============ HANDLERS ============

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

  const handleHoldingPress = (holding: any) => {
    if (!gameInstanceId || !walletId || !holding.asset) return;
    router.push({
      pathname: '/game/asset-detail',
      params: {
        id: holding.asset.id.toString(),
        gameInstanceId: gameInstanceId.toString(),
        walletId: walletId.toString(),
      },
    });
  };

  const startGameNow = async () => {
    if (!gameInstanceId || !levelData?.level) {
      Alert.alert('Erreur', 'Instance de jeu non trouvée');
      return;
    }

    try {
      setIsStarting(true);

      await startGameMutation.mutateAsync({ id: gameInstanceId });

      setActiveGameInstanceId(gameInstanceId);
      setIsPaused(false);
      setIsAnimating(false);
      setTargetDate(null);
      setGameDate(new Date(GAME_START_DATE));

      setGameTimeState({
        createdAt: new Date(),
        totalPausedDuration: 0,
        duration: levelData.level.duration ?? 30,
        speed: levelData.level.speed ?? 1,
        isEnded: false,
        isPaused: false,
        pausedAt: null,
      });
    } catch (err) {
      console.error('Error starting game:', err);
      Alert.alert('Erreur', 'Impossible de démarrer la partie');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartGame = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour jouer');
      return;
    }

    if (!gameInstanceId) {
      Alert.alert('Erreur', 'Initialisation en cours, veuillez patienter...');
      return;
    }

    if (holdings.length === 0) {
      setShowNoInvestmentModal(true);
      return;
    }

    await startGameNow();
  };

  const handleConfirmStartWithoutInvestment = async () => {
    setShowNoInvestmentModal(false);
    await startGameNow();
  };

  const handleResetLevel = async () => {
    if (!user || !levelId) return;

    Alert.alert(
      'Réinitialiser le niveau',
      'Cette action supprimera toutes vos parties sur ce niveau. Voulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              await resetLevelMutation.mutateAsync({
                userId: user.id,
                levelId: parseInt(levelId, 10),
              });

              setGameInstanceId(null);
              setWalletId(null);
              setIsPaused(true);
              setIsGameEnded(false);
              setGameTimeState(null);
              setGameDate(GAME_START_DATE);

              // Create new instance
              await createGameInstanceForPreparation();

              Alert.alert('Succès', 'Le niveau a été réinitialisé. Vous pouvez recommencer !');
            } catch (err) {
              console.error('Error resetting level:', err);
              Alert.alert('Erreur', 'Impossible de réinitialiser le niveau');
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

  // ============ RENDER ============

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  if (!levelId && !gameId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            ID du niveau ou de la partie manquant
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
            <View style={styles.assetCardWrapper}>
              <TouchableOpacity
                style={[styles.assetCard, styles.addAssetCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleAddAsset}
                activeOpacity={0.8}
              >
                <Text style={[styles.addAssetIcon, { color: theme.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            {holdings.map((holding: any) => (
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
                    <Text style={[styles.assetRateArrow, { color: (holding.asset?.taux ?? 0) >= 0 ? '#4CAF50' : '#F44336' }]}>
                      {(holding.asset?.taux ?? 0) >= 0 ? '▲' : '▼'}
                    </Text>
                    <Text style={[styles.assetRate, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
                      {holding.asset?.taux ?? 0}%
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
                  Démarrer
                </Text>
              )}
            </TouchableOpacity>

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
              Vous n'avez fait aucun investissement. Si vous démarrez maintenant, vous ne pourrez pas gagner d'argent pendant la partie.
            </Text>
            <Text style={[styles.modalMessage, { fontFamily: CashouTheme.fonts.body, color: theme.text, marginTop: 8 }]}>
              Voulez-vous vraiment démarrer sans investir ?
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
                  Démarrer quand même
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

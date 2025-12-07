import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme, Alert, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import FastForwardIcon from '@/assets/images/fast-forward.svg';
import PauseIcon from '@/assets/images/pause.svg';
import StopIcon from '@/assets/images/stop.svg';

interface GameStats {
  level: number;
  cash: number;
  timePassed: string;
  successes: number;
}

interface Asset {
  id: number;
  title: string | null;
  symbol: string | null;
  rate: number | null;
  description: string | null;
}

interface LevelData {
  level: {
    id: number;
    title: string | null;
    number: number | null;
    startBalance: number | null;
    duration: number | null;
    speed: number | null;
  } | null;
}

interface GameTimeState {
  createdAt: Date;
  totalPausedDuration: number; // en secondes
  duration: number; // jours de jeu
  speed: number; // multiplicateur
  isEnded: boolean; // partie terminée
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
  const [holdingsCount, setHoldingsCount] = useState(0);
  const [showNoInvestmentModal, setShowNoInvestmentModal] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);

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

  // Assets simulés pour la démo (à remplacer par de vraies données)
  const [assets, setAssets] = useState<Asset[]>([
  ]);

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

  // Helper function to load holdings count for a game instance
  const loadHoldingsCount = async (gInstanceId: number) => {
    try {
      const holdings = await trpcClient.holding.getByGameInstance.query({ gameInstanceId: gInstanceId });
      setHoldingsCount(holdings?.length ?? 0);
    } catch (err) {
      console.error('Error fetching holdings:', err);
      setHoldingsCount(0);
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
      setWalletId(wallet.id);
      setIsPaused(true);
      setIsGameEnded(false);
      setHoldingsCount(0);

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
      if (!levelId) {
        setError('ID du niveau manquant');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Charger les données du niveau
        const data = await trpcClient.level.getSummary.query({ id: parseInt(levelId, 10) });
        setLevelData(data as LevelData);

        // Mettre à jour les stats avec le niveau
        if (data.level) {
          setStats(prev => ({
            ...prev,
            level: data.level?.number || 1,
            cash: data.level?.startBalance || 1000,
          }));
        }

        // Si on a un gameId, charger l'état de la partie existante
        if (gameId) {
          try {
            const gameInstance = await trpcClient.gameInstance.getById.query({ id: parseInt(gameId, 10) });
            if (gameInstance) {
              setGameInstanceId(gameInstance.id);
              setIsPaused(gameInstance.isPaused ?? true);
              setIsGameEnded(gameInstance.isEnded ?? false);

              // Charger le wallet associé à cette instance
              try {
                const wallets = await trpcClient.wallet.getByGameInstance.query({ gameInstanceId: gameInstance.id });
                if (wallets && wallets.length > 0) {
                  setWalletId(wallets[0].id);
                }
              } catch (walletErr) {
                console.error('Error fetching wallet:', walletErr);
              }

              // Charger les holdings
              await loadHoldingsCount(gameInstance.id);

              // Initialiser l'état du temps pour l'animation locale
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
                };
                setGameTimeState(newTimeState);

                // Calculer la date cible pour l'animation
                const target = isEnded
                  ? calculateEndDate(duration)
                  : (() => {
                      // Calculer la date actuelle du jeu
                      const now = Date.now();
                      const startTime = new Date(gameInstance.createdAt).getTime();
                      let elapsedSeconds = Math.floor((now - startTime) / 1000);
                      elapsedSeconds -= (gameInstance.totalPausedDuration ?? 0);

                      // Si le jeu est actuellement en pause, soustraire aussi la durée de pause actuelle
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

                // Si la partie est terminée, afficher directement la date finale sans animation
                if (isEnded) {
                  setGameDate(target);
                } else if (target.getTime() > GAME_START_DATE.getTime()) {
                  // Sinon, animer si la date cible est différente de la date de départ
                  setTargetDate(target);
                  setGameDate(new Date(GAME_START_DATE)); // Commencer depuis le début
                  setIsAnimating(true);
                } else {
                  setGameDate(target);
                }
              }
            }
          } catch (err) {
            console.error('Error fetching game instance:', err);
            // La partie n'existe plus, on réinitialise
            setGameInstanceId(null);
            setIsPaused(true);
            setGameTimeState(null);
            setIsGameEnded(false);
          }
        } else if (user && data.level) {
          // Pas de gameId fourni, créer automatiquement une instance en mode préparation
          await createGameInstanceForPreparation(data as LevelData);
        }
      } catch (err) {
        console.error('Error fetching level data:', err);
        setError('Erreur lors du chargement du niveau');
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
  }, [gameTimeState, isPaused, isAnimating, isGameEnded, isEndingGame, calculateGameDate, checkIfTimeElapsed, handleGameEnd]);

  // Resynchronisation quand on revient sur la page (sans animation)
  useFocusEffect(
    useCallback(() => {
      if (!gameInstanceId) return;

      const resync = async () => {
        try {
          const instance = await trpcClient.gameInstance.getById.query({ id: gameInstanceId });
          if (instance?.level) {
            const isEnded = instance.isEnded ?? false;
            setGameTimeState({
              createdAt: new Date(instance.createdAt),
              totalPausedDuration: instance.totalPausedDuration ?? 0,
              duration: instance.level.duration ?? 30,
              speed: instance.level.speed ?? 1,
              isEnded,
            });
            setIsPaused(instance.isPaused ?? false);
            setIsGameEnded(isEnded);

            // Si la partie est terminée, afficher directement la date de fin
            if (isEnded) {
              const duration = instance.level.duration ?? 30;
              setGameDate(calculateEndDate(duration));
            }
          }

          // Recharger les holdings pour mettre à jour le compteur
          await loadHoldingsCount(gameInstanceId);
        } catch (err) {
          console.error('Error resyncing game state:', err);
        }
      };

      resync();
    }, [gameInstanceId, calculateEndDate])
  );

  // Redirection vers l'écran de résumé quand la partie est terminée
  useEffect(() => {
    if (isGameEnded && gameInstanceId) {
      // Rediriger vers l'écran de résumé
      router.replace({
        pathname: '/(tabs)/summary',
        params: { gameId: gameInstanceId.toString() },
      });
    }
  }, [isGameEnded, gameInstanceId]);

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

  const handleAssetPress = (asset: Asset) => {
    // TODO: Ouvrir le détail de l'asset ou permettre l'achat
    console.log('Asset pressed:', asset.title);
  };

  // Fonction pour effectivement démarrer le jeu (unpause)
  const startGameNow = async () => {
    if (!gameInstanceId || !levelData?.level) {
      Alert.alert('Erreur', 'Instance de jeu non trouvée');
      return;
    }

    try {
      setIsStarting(true);

      // Démarrer le jeu via l'API (réinitialise createdAt et démarre le chrono)
      await trpcClient.gameInstance.start.mutate({ id: gameInstanceId });

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
    if (holdingsCount === 0) {
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
          <Text style={[styles.title, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            Niveau {stats.level}
          </Text>

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

            {/* Asset Cards */}
            {assets.map((asset) => (
              <View key={asset.id} style={styles.assetCardWrapper}>
                <TouchableOpacity
                  style={[styles.assetCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleAssetPress(asset)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.assetTitle, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
                    {asset.title}
                  </Text>
                  <View style={styles.assetRateContainer}>
                    <Text style={styles.assetRateArrow}>▲</Text>
                    <Text style={[styles.assetRate, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
                      {asset.rate}%
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
  title: {
    fontSize: 24,
    marginBottom: 12,
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
    minHeight: 100,
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
    marginBottom: 12,
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

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme, Alert } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useHeaderOptions } from '@/hooks/use-header';
import { useAuth } from '@/hooks/use-auth';

interface GoalResult {
  id: number;
  title: string;
  description: string | null;
  validated: boolean;
}

interface EndGameResult {
  success: boolean;
  gameInstanceId: number;
  startBalance: number;
  walletBalance: number;
  assetsValue: number;
  totalValue: number;
  goals: GoalResult[];
  message: string;
  stars?: number;
  mandatoryGoalsMet?: boolean;
  bonusGoalsMet?: boolean;
  quizPassed?: boolean;
}

interface GameInstanceData {
  id: number;
  createdAt: string;
  endedAt: string | null;
  totalPausedDuration: number | null;
  level: {
    id: number;
    title: string | null;
    number: number | null;
    duration: number | null;
    speed: number | null;
    startBalance: number | null;
  } | null;
}

export default function GameSummaryScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { user } = useAuth();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const insets = useSafeAreaInsets();

  useHeaderOptions({ showBackButton: true });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endGameResult, setEndGameResult] = useState<EndGameResult | null>(null);
  const [gameInstance, setGameInstance] = useState<GameInstanceData | null>(null);
  const [levelQuizId, setLevelQuizId] = useState<number | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!gameId) {
        setError('ID de la partie manquant');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch game instance data
        const instance = await trpcClient.gameInstance.getById.query({ id: parseInt(gameId, 10) });
        if (instance) {
          setGameInstance(instance as GameInstanceData);

          // Fetch quiz for this level
          if (instance.level?.id) {
            try {
              const quizzes = await trpcClient.quiz.getByLevel.query({ levelId: instance.level.id });
              if (quizzes && quizzes.length > 0) {
                setLevelQuizId(quizzes[0].id);
              }
            } catch (quizErr) {
              console.error('Error fetching level quiz:', quizErr);
            }
          }
        }

        // Fetch end game results
        const result = await trpcClient.gameInstance.endGame.mutate({ id: parseInt(gameId, 10) });
        setEndGameResult(result as EndGameResult);
      } catch (err) {
        console.error('Error fetching game summary:', err);
        setError('Erreur lors du chargement des resultats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId]);

  // Refresh stars when returning from level quiz (getHomeData has up-to-date completion)
  useFocusEffect(
    useCallback(() => {
      if (!gameInstance?.level?.id || !endGameResult?.success) return;
      let cancelled = false;
      trpcClient.auth.getHomeData.query().then((homeData: any) => {
        if (cancelled) return;
        const last = homeData?.lastCompletedGame;
        if (last?.levelId === gameInstance.level?.id && last != null) {
          setEndGameResult((prev) =>
            prev
              ? {
                  ...prev,
                  stars: last.stars ?? prev.stars,
                  mandatoryGoalsMet: last.mandatoryGoalsMet ?? prev.mandatoryGoalsMet,
                  bonusGoalsMet: last.bonusGoalsMet ?? prev.bonusGoalsMet,
                  quizPassed: last.quizPassed ?? prev.quizPassed,
                }
              : prev
          );
        }
      }).catch(() => {});
      return () => { cancelled = true; };
    }, [gameInstance?.level?.id, endGameResult?.success])
  );

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const handleGoToQuiz = () => {
    if (levelQuizId) {
      router.push({
        pathname: '/(tabs)/daily-quiz',
        params: { quizId: levelQuizId.toString() }
      });
    }
  };

  const handleReplay = async () => {
    if (!user?.id || !gameInstance?.level?.id) return;
    setIsReplaying(true);
    try {
      const levelId = gameInstance.level.id;
      const startBalance = gameInstance.level.startBalance ?? 1000;
      const newGame = await trpcClient.gameInstance.create.mutate({
        userId: user.id,
        levelId,
        startBalance,
        isPaused: true,
      });
      await trpcClient.wallet.create.mutate({
        userId: user.id,
        gameInstanceId: newGame.id,
        amount: startBalance,
      });
      router.replace({
        pathname: '/game/current',
        params: { gameId: String(newGame.id), levelId: String(levelId) },
      });
    } catch (err) {
      console.error('Error creating replay game:', err);
      Alert.alert('Erreur', 'Impossible de créer la partie');
    } finally {
      setIsReplaying(false);
    }
  };

  // Calculate profit percentage
  const calculateProfitPercent = (): string => {
    if (!endGameResult) return '0%';
    const profit = ((endGameResult.totalValue - endGameResult.startBalance) / endGameResult.startBalance) * 100;
    const sign = profit >= 0 ? '+' : '';
    return `${sign}${profit.toFixed(1)}%`;
  };

  const getProfitColor = (): string => {
    if (!endGameResult) return theme.text;
    const profit = endGameResult.totalValue - endGameResult.startBalance;
    if (profit > 0) return '#4CAF50';
    if (profit < 0) return '#F44336';
    return theme.text;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Calcul des resultats...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !endGameResult) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.accent} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            {error || 'Erreur lors du chargement'}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleGoHome}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}>
        {/* Header with result */}
        <View style={[styles.resultHeader, { backgroundColor: endGameResult.success ? '#4CAF50' : '#F44336' }]}>
          <Ionicons
            name={endGameResult.success ? 'trophy' : 'close-circle'}
            size={64}
            color="#FFFFFF"
          />
          <Text style={styles.resultTitle}>
            {endGameResult.success ? 'Niveau reussi !' : 'Niveau echoue'}
          </Text>
          <Text style={styles.resultSubtitle}>
            Niveau {gameInstance?.level?.number || '?'} - {gameInstance?.level?.title || 'Sans titre'}
          </Text>
        </View>

        {/* Score: stars and criteria (when success and stars returned) */}
        {endGameResult.success && endGameResult.stars != null && endGameResult.stars > 0 && (
          <View style={[styles.card, styles.scoreCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="star" size={24} color={CashouTheme.colors.special.gold} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Score</Text>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= endGameResult.stars! ? 'star' : 'star-outline'}
                  size={28}
                  color={i <= endGameResult.stars! ? CashouTheme.colors.special.gold : CashouTheme.colors.icon.muted}
                  style={styles.starIcon}
                />
              ))}
            </View>
            <View style={styles.criteriaRow}>
              <Text style={[styles.criteriaText, { color: theme.text, opacity: 0.8 }]}>
                Objectifs obligatoires : {endGameResult.mandatoryGoalsMet ? 'OK' : 'Non'}
              </Text>
              <Text style={[styles.criteriaText, { color: theme.text, opacity: 0.8 }]}>
                Bonus : {endGameResult.bonusGoalsMet ? 'OK' : 'Non'}
              </Text>
              <Text style={[styles.criteriaText, { color: theme.text, opacity: 0.8 }]}>
                Quiz : {endGameResult.quizPassed ? 'OK' : 'À faire'}
              </Text>
            </View>
          </View>
        )}

        {/* Financial summary */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={24} color={theme.text} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Bilan financier</Text>
          </View>

          <View style={styles.financialGrid}>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.text, opacity: 0.7 }]}>Capital initial</Text>
              <Text style={[styles.financialValue, { color: theme.text }]}>
                {Math.round(endGameResult.startBalance).toLocaleString('fr-FR')} EUR
              </Text>
            </View>

            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.text, opacity: 0.7 }]}>Cash final</Text>
              <Text style={[styles.financialValue, { color: theme.text }]}>
                {Math.round(endGameResult.walletBalance).toLocaleString('fr-FR')} EUR
              </Text>
            </View>

            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.text, opacity: 0.7 }]}>Valeur des actifs</Text>
              <Text style={[styles.financialValue, { color: theme.text }]}>
                {Math.round(endGameResult.assetsValue).toLocaleString('fr-FR')} EUR
              </Text>
            </View>

            <View style={[styles.financialItem, styles.totalItem]}>
              <Text style={[styles.financialLabel, { color: theme.text }]}>Portefeuille final</Text>
              <Text style={[styles.totalValue, { color: getProfitColor() }]}>
                {Math.round(endGameResult.totalValue).toLocaleString('fr-FR')} EUR
              </Text>
              <Text style={[styles.profitPercent, { color: getProfitColor() }]}>
                {calculateProfitPercent()}
              </Text>
            </View>
          </View>
        </View>

        {/* Goals */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="flag-outline" size={24} color={theme.text} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Objectifs</Text>
          </View>

          {endGameResult.goals.map((goal) => (
            <View key={goal.id} style={styles.goalItem}>
              <View style={[styles.goalIcon, { backgroundColor: goal.validated ? '#4CAF50' : '#F44336' }]}>
                <Ionicons
                  name={goal.validated ? 'checkmark' : 'close'}
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.goalContent}>
                <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
                {goal.description && (
                  <Text style={[styles.goalDescription, { color: theme.text, opacity: 0.7 }]}>
                    {goal.description}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Quiz button */}
        {levelQuizId && (
          <TouchableOpacity
            style={styles.quizButton}
            onPress={handleGoToQuiz}
          >
            <Ionicons name="school-outline" size={24} color="#FFFFFF" />
            <Text style={styles.quizButtonText}>Faire le quiz du niveau</Text>
          </TouchableOpacity>
        )}

        {/* Replay button */}
        {user && gameInstance?.level?.id && (
          <TouchableOpacity
            style={[styles.replayButton, isReplaying && styles.replayButtonDisabled]}
            onPress={handleReplay}
            disabled={isReplaying}
          >
            {isReplaying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="play-circle-outline" size={24} color="#FFFFFF" />
            )}
            <Text style={styles.replayButtonText}>
              {isReplaying ? 'Création en cours...' : 'Rejouer'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  resultHeader: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  resultSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
  },
  scoreCard: {
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starIcon: {
    marginHorizontal: 2,
  },
  criteriaRow: {
    gap: 4,
  },
  criteriaText: {
    fontSize: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  financialGrid: {
    gap: 12,
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 14,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalItem: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    flexWrap: 'wrap',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profitPercent: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  goalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  goalDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  quizButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  quizButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  replayButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  replayButtonDisabled: {
    opacity: 0.7,
  },
  replayButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

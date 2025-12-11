import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useHeaderOptions } from '@/hooks/use-header';

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
  } | null;
}

export default function GameSummaryScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const insets = useSafeAreaInsets();

  useHeaderOptions({ showBackButton: false });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endGameResult, setEndGameResult] = useState<EndGameResult | null>(null);
  const [gameInstance, setGameInstance] = useState<GameInstanceData | null>(null);

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

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  // Calculate time elapsed (excluding paused time)
  const calculateTimeElapsed = (): string => {
    if (!gameInstance?.createdAt || !gameInstance?.endedAt) {
      return 'N/A';
    }

    const start = new Date(gameInstance.createdAt);
    const end = new Date(gameInstance.endedAt);
    let diffMs = end.getTime() - start.getTime();

    // Soustraire le temps de pause (stocké en secondes)
    const pausedDurationMs = (gameInstance.totalPausedDuration ?? 0) * 1000;
    diffMs = Math.max(0, diffMs - pausedDurationMs);

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}j ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`;
    } else {
      return `${diffSeconds}s`;
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

        {/* Time elapsed */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={24} color={theme.text} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Temps de jeu</Text>
          </View>
          <Text style={[styles.timeValue, { color: theme.text }]}>
            {calculateTimeElapsed()}
          </Text>
          <Text style={[styles.timeSubtext, { color: theme.text, opacity: 0.7 }]}>
            {gameInstance?.level?.duration || 0} jours simules
          </Text>
        </View>

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
  timeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timeSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
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
});

import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpc, trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';

interface GameHistoryItem {
  id: number;
  createdAt: string;
  endedAt: string | null;
  isEnded: boolean;
  level: {
    id: number;
    title: string | null;
    number: number | null;
    duration: number | null;
  } | null;
  wallet: {
    id: number;
    amount: string | number | null;
  } | null;
  levelQuizCompleted?: boolean; // Indique si le quiz du niveau est complété
}

export default function GameHistoryScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  useHeaderOptions({ showBackButton: false });

  // Fetch game instances using React Query
  const {
    data: instances,
    isLoading: instancesLoading,
    error: instancesError,
  } = trpc.gameInstance.getByUser.useQuery(
    { userId: user?.id! },
    {
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  );

  // Sort instances by creation date (most recent first)
  const sortedInstances = useMemo(() => {
    if (!instances) return [];
    return [...instances].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [instances]);

  // State for quiz completion status (enriched data)
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [quizStatusLoading, setQuizStatusLoading] = useState(false);

  // Enrich game instances with quiz completion status
  useEffect(() => {
    const enrichWithQuizStatus = async () => {
      if (!sortedInstances.length || !user) {
        setGameHistory(sortedInstances as GameHistoryItem[]);
        return;
      }

      setQuizStatusLoading(true);
      try {
        const gamesWithQuizStatus = await Promise.all(
          sortedInstances.map(async (game: any) => {
            if (!game.isEnded || !game.level?.id) {
              return { ...game, levelQuizCompleted: false };
            }

            try {
              const quizzes = await trpcClient.quiz.getByLevel.query({ levelId: game.level.id });
              if (!quizzes || quizzes.length === 0) {
                return { ...game, levelQuizCompleted: true };
              }

              const quizId = quizzes[0].id;
              const participations = await trpcClient.userQuiz.getByQuiz.query({ quizId });
              const userParticipation = (participations as any[]).find(
                (p: any) => p.userId === user.id && p.completedAt !== null
              );

              return { ...game, levelQuizCompleted: userParticipation !== undefined };
            } catch (err) {
              console.error('Error checking quiz completion for game', game.id, err);
              return { ...game, levelQuizCompleted: false };
            }
          })
        );

        setGameHistory(gamesWithQuizStatus as GameHistoryItem[]);
      } catch (err) {
        console.error('Error enriching game history:', err);
        setGameHistory(sortedInstances as GameHistoryItem[]);
      } finally {
        setQuizStatusLoading(false);
      }
    };

    enrichWithQuizStatus();
  }, [sortedInstances, user]);

  const isLoading = instancesLoading || quizStatusLoading;
  const error = !user ? 'Vous devez etre connecte' : instancesError?.message ?? null;

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleGamePress = (game: GameHistoryItem) => {
    if (game.isEnded) {
      // Partie terminee -> ecran de resume
      router.push({
        pathname: '/(tabs)/summary',
        params: { gameId: game.id.toString() },
      });
    } else {
      // Partie en cours -> ecran de jeu
      router.push({
        pathname: '/game/current',
        params: {
          levelId: game.level?.id.toString() || '',
          gameId: game.id.toString(),
        },
      });
    }
  };

  const renderGameItem = ({ item }: { item: GameHistoryItem }) => {
    const walletAmount = item.wallet?.amount ? Number(item.wallet.amount) : 0;

    return (
      <TouchableOpacity
        style={[styles.gameCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => handleGamePress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.gameHeader}>
          <View style={styles.levelBadge}>
            <Text style={[styles.levelNumber, { color: theme.text }]}>
              Niveau {item.level?.number || '?'}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { 
              backgroundColor: item.isEnded 
                ? (item.levelQuizCompleted ? '#4CAF50' : '#FF9800') // Vert si quiz complété, orange sinon
                : '#FF9800' // Orange pour en cours
            }
          ]}>
            <Text style={styles.statusText}>
              {item.isEnded 
                ? (item.levelQuizCompleted ? 'Termine' : 'Quiz') 
                : 'En cours'}
            </Text>
          </View>
        </View>

        <Text style={[styles.levelTitle, { color: theme.text }]}>
          {item.level?.title || 'Sans titre'}
        </Text>

        <View style={styles.gameInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color={theme.text} style={{ opacity: 0.7 }} />
            <Text style={[styles.infoText, { color: theme.text, opacity: 0.7 }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>

          {item.isEnded && item.endedAt && (
            <View style={styles.infoItem}>
              <Ionicons name="flag-outline" size={16} color={theme.text} style={{ opacity: 0.7 }} />
              <Text style={[styles.infoText, { color: theme.text, opacity: 0.7 }]}>
                Fin: {formatDate(item.endedAt)}
              </Text>
            </View>
          )}

          <View style={styles.infoItem}>
            <Ionicons name="wallet-outline" size={16} color={theme.text} style={{ opacity: 0.7 }} />
            <Text style={[styles.infoText, { color: theme.text, opacity: 0.7 }]}>
              {walletAmount.toLocaleString('fr-FR')} EUR
            </Text>
          </View>
        </View>

        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={24} color={theme.text} style={{ opacity: 0.5 }} />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Chargement de l'historique...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.accent} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
          Historique des parties
        </Text>
      </View>

      {gameHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="game-controller-outline" size={64} color={theme.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyText, { color: theme.text }]}>
            Aucune partie jouee pour le moment
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.startButtonText}>Commencer une partie</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={gameHistory}
          renderItem={renderGameItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
    paddingTop: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 32,
    paddingTop: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  startButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 16,
    gap: 12,
  },
  gameCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  gameInfo: {
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
  },
  arrowContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
  },
});

import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
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

interface UserQuizParticipation {
  userId: string | null;
  completedAt: Date | null;
}

export default function GameHistoryScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  useHeaderOptions({ showBackButton: true });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setError('Vous devez etre connecte');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const instances = await trpcClient.gameInstance.getByUser.query({ userId: user.id });
        // Trier par date de creation decroissante
        const sorted = [...instances].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Pour chaque partie terminée, vérifier si le quiz du niveau est complété
        const gamesWithQuizStatus = await Promise.all(
          (sorted as GameHistoryItem[]).map(async (game) => {
            if (!game.isEnded || !game.level?.id) {
              return { ...game, levelQuizCompleted: false };
            }

            try {
              // Récupérer le quiz du niveau
              const quizzes = await trpcClient.quiz.getByLevel.query({ levelId: game.level.id });
              if (!quizzes || quizzes.length === 0) {
                return { ...game, levelQuizCompleted: true }; // Pas de quiz = considéré comme complété
              }

              const quizId = quizzes[0].id;

              // Vérifier si l'utilisateur a complété ce quiz
              const participations = await trpcClient.userQuiz.getByQuiz.query({ quizId });
              const userParticipation = (participations as UserQuizParticipation[]).find(
                (p) => p.userId === user.id && p.completedAt !== null
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
        console.error('Error fetching game history:', err);
        setError('Erreur lors du chargement de l\'historique');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

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

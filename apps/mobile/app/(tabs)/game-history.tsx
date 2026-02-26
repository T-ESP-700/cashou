import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';

interface LevelStars {
  mandatory: boolean; // Etoile 1 : objectif obligatoire rempli
  bonus: boolean;     // Etoile 2 : objectif bonus rempli
  quiz: boolean;      // Etoile 3 : quiz du niveau complete
}

interface LevelItem {
  id: number;
  number: number | null;
  title: string | null;
  unlocked: boolean;
  status: 'completed' | 'current' | 'locked';
  gameId?: number;
  stars: LevelStars;
}

export default function LevelsScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  useHeaderOptions({ showBackButton: false });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<LevelItem[]>([]);

  useEffect(() => {
    const fetchLevels = async () => {
      if (!user) {
        setError('Vous devez etre connecte');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const [userLevels, gameInstances] = await Promise.all([
          trpcClient.level.getUserLevels.query({ userId: user.id }),
          trpcClient.gameInstance.getByUser.query({ userId: user.id }),
        ]);

        // Determiner les niveaux completes (au moins une partie terminee)
        const completedLevelIds = new Set(
          (gameInstances as any[])
            .filter((g: any) => g.isEnded && g.levelId)
            .map((g: any) => g.levelId)
        );

        // Trouver les parties en cours par niveau
        const activeGameByLevel = new Map<number, number>();
        for (const g of gameInstances as any[]) {
          if (!g.isEnded && g.levelId) {
            activeGameByLevel.set(g.levelId, g.id);
          }
        }

        // Pour chaque niveau complete, calculer les etoiles
        const completedGamesMap = new Map<number, any>();
        for (const g of gameInstances as any[]) {
          if (g.isEnded && g.levelId) {
            // Garder la derniere partie terminee par niveau
            if (!completedGamesMap.has(g.levelId)) {
              completedGamesMap.set(g.levelId, g);
            }
          }
        }

        // Trouver le premier niveau non complete et debloque (= niveau courant)
        let currentLevelId: number | null = null;
        for (const ul of userLevels as any[]) {
          if (ul.unlocked && !completedLevelIds.has(ul.level.id)) {
            currentLevelId = ul.level.id;
            break;
          }
        }

        // Construire la liste des niveaux avec les etoiles
        const result: LevelItem[] = await Promise.all(
          (userLevels as any[]).map(async (ul: any) => {
            const isCompleted = completedLevelIds.has(ul.level.id);
            const isCurrent = ul.level.id === currentLevelId;

            let status: LevelItem['status'];
            if (isCompleted) {
              status = 'completed';
            } else if (isCurrent) {
              status = 'current';
            } else {
              status = 'locked';
            }

            // Calculer les etoiles pour les niveaux completes
            let stars: LevelStars = { mandatory: false, bonus: false, quiz: false };

            if (isCompleted) {
              const game = completedGamesMap.get(ul.level.id);
              const startBalance = game?.startBalance || ul.level.startBalance || 0;
              const walletAmount = game?.wallets?.[0]?.amount ? Number(game.wallets[0].amount) : 0;

              // Etoile 1 : objectif obligatoire (wallet >= startBalance)
              stars.mandatory = walletAmount >= startBalance;

              // Etoile 2 : objectif bonus (verifier les goals du niveau)
              try {
                const goals = await trpcClient.levelGoal.getByLevelId.query({ levelId: ul.level.id });
                const goalsList = goals as any[];
                if (goalsList.length >= 2) {
                  // Objectif bonus = deuxieme goal
                  const bonusGoal = goalsList[1]?.goal;
                  if (bonusGoal?.goalType === 'wallet_gt_start') {
                    stars.bonus = walletAmount > startBalance + (bonusGoal.goalValue || 0);
                  } else if (bonusGoal?.goalType === 'wallet_min') {
                    stars.bonus = walletAmount >= (bonusGoal.goalValue || 0);
                  } else {
                    stars.bonus = walletAmount > startBalance;
                  }
                } else if (goalsList.length === 1) {
                  // Un seul goal = pas de bonus
                  stars.bonus = false;
                }
              } catch {
                stars.bonus = false;
              }

              // Etoile 3 : quiz complete
              stars.quiz = ul.stars > 0;
            }

            const completedGame = completedGamesMap.get(ul.level.id);
            return {
              id: ul.level.id,
              number: ul.level.number,
              title: ul.level.title,
              unlocked: ul.unlocked,
              status,
              gameId: activeGameByLevel.get(ul.level.id) ?? completedGame?.id,
              stars,
            };
          })
        );

        setLevels(result);
      } catch (err) {
        console.error('Error fetching levels:', err);
        setError('Erreur lors du chargement des niveaux');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLevels();
  }, [user]);

  const handleLevelPress = (level: LevelItem) => {
    if (level.status === 'locked') return;

    if (level.status === 'current') {
      if (level.gameId) {
        router.push({
          pathname: '/game/current',
          params: {
            levelId: level.id.toString(),
            gameId: level.gameId.toString(),
          },
        });
      } else {
        router.push({
          pathname: '/game/current',
          params: { levelId: level.id.toString() },
        });
      }
    } else if (level.status === 'completed' && level.gameId) {
      router.push({
        pathname: '/(tabs)/summary',
        params: { gameId: level.gameId.toString() },
      });
    }
  };

  const renderStars = (stars: LevelStars) => {
    const starData = [stars.mandatory, stars.bonus, stars.quiz];
    return (
      <View style={styles.starsContainer}>
        {starData.map((filled, i) => (
          <Ionicons
            key={i}
            name={filled ? 'star' : 'star-outline'}
            size={12}
            color={filled ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
          />
        ))}
      </View>
    );
  };

  const renderStatusIcon = (status: LevelItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Ionicons name="checkmark-circle" size={34} color="#88D498" />
        );
      case 'current':
        return (
          <View style={styles.statusIconCurrent}>
            <Ionicons name="arrow-forward" size={18} color="#2B2C48" />
          </View>
        );
      case 'locked':
        return (
          <View style={styles.statusIconLocked}>
            <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
          </View>
        );
    }
  };

  const renderLevelItem = ({ item }: { item: LevelItem }) => {
    const isLocked = item.status === 'locked';
    const isCurrent = item.status === 'current';
    const isCompleted = item.status === 'completed';

    return (
      <TouchableOpacity
        style={[
          styles.levelRow,
          isLocked && styles.levelRowLocked,
          isCurrent && styles.levelRowCurrent,
          isCompleted && styles.levelRowCompleted,
        ]}
        onPress={() => handleLevelPress(item)}
        activeOpacity={isLocked ? 1 : 0.7}
        disabled={isLocked}
      >
        <View style={styles.levelInfo}>
          <Text
            style={[
              styles.levelName,
              isLocked && styles.levelNameLocked,
            ]}
          >
            Niveau {item.number ?? '?'}
          </Text>
          {isCompleted && renderStars(item.stars)}
        </View>
        <View style={styles.statusIcon}>
          {renderStatusIcon(item.status)}
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
            Chargement des niveaux...
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={levels}
        renderItem={renderLevelItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontFamily: 'Anybody',
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
    fontFamily: 'Anybody',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  // Base level row
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  // Completed level: white bg, no border
  levelRowCompleted: {
    backgroundColor: '#FFFFFF',
  },
  // Current level: white bg, orange border
  levelRowCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFA667',
    borderWidth: 2,
  },
  // Locked level: gray bg
  levelRowLocked: {
    backgroundColor: '#D9D9D9',
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  levelName: {
    fontSize: 20,
    fontFamily: 'Anybody',
    color: '#2B2C48',
  },
  levelNameLocked: {
    color: '#2B2C48',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFA667',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statusIcon: {
    marginLeft: 12,
  },
  // Orange rounded square for current
  statusIconCurrent: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFB472',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Gray circle for locked
  statusIconLocked: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A0A0A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

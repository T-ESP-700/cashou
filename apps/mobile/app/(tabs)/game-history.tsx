import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
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
  hasActiveGame: boolean;
  stars: LevelStars;
}

export default function LevelsScreen() {
  const { colors: theme, isDark, special } = useCashouTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  useHeaderOptions({ showBackButton: false, title: 'Historique' });

  const flatListRef = useRef<FlatList<LevelItem>>(null);
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

        // Trouver les parties en cours par niveau
        const activeGameByLevel = new Map<number, number>();
        for (const g of gameInstances as any[]) {
          if (!g.isEnded && g.levelId) {
            activeGameByLevel.set(g.levelId, g.id);
          }
        }

        // Pour les niveaux complétés (recap), garder une gameInstance de référence
        const completedGamesMap = new Map<number, any>();
        for (const g of gameInstances as any[]) {
          if (g.isEnded && g.levelId) {
            if (!completedGamesMap.has(g.levelId)) {
              completedGamesMap.set(g.levelId, g);
            }
          }
        }

        // Un niveau est "complété" uniquement s'il a au moins 1 étoile (partie finie avec récompenses)
        // 0 étoile = abandonné ou jamais validé = non terminé
        // Trouver le premier niveau non complété et débloqué (= niveau courant)
        let currentLevelId: number | null = null;
        for (const ul of userLevels as any[]) {
          if (ul.unlocked && (ul.stars ?? 0) < 1) {
            currentLevelId = ul.level.id;
            break;
          }
        }

        // Construire la liste des niveaux avec les etoiles
        const result: LevelItem[] = (userLevels as any[]).map((ul: any) => {
            const isCompleted = (ul.stars ?? 0) >= 1;
            const isCurrent = ul.level.id === currentLevelId;

            let status: LevelItem['status'];
            if (isCompleted) {
              status = 'completed';
            } else if (isCurrent) {
              status = 'current';
            } else {
              status = 'locked';
            }

            // Les étoiles viennent directement de UserLevelCompletion via getUserLevels
            const stars: LevelStars = {
              mandatory: ul.mandatoryGoalsMet ?? false,
              bonus: ul.bonusGoalsMet ?? false,
              quiz: ul.quizPassed ?? false,
            };

            const completedGame = completedGamesMap.get(ul.level.id);
            const activeGameId = activeGameByLevel.get(ul.level.id);
            return {
              id: ul.level.id,
              number: ul.level.number,
              title: ul.level.title,
              unlocked: ul.unlocked,
              status,
              gameId: activeGameId ?? completedGame?.id,
              hasActiveGame: !!activeGameId,
              stars,
            };
        });

        setLevels(result);

        // Scroll to the first unlocked non-completed level after render
        const nextLevelIndex = result.findIndex((l) => l.status === 'current');
        if (nextLevelIndex > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: Math.max(0, nextLevelIndex - 2), // Show a couple completed levels above for context
              animated: true,
            });
          }, 300);
        }
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

    // Partie en cours : aller sur la partie (même si niveau déjà complété)
    if (level.hasActiveGame && level.gameId) {
      router.push({
        pathname: '/game/current',
        params: {
          levelId: level.id.toString(),
          gameId: level.gameId.toString(),
        },
      });
      return;
    }

    if (level.status === 'current') {
      router.push({
        pathname: '/game/current',
        params: { levelId: level.id.toString() },
      });
    } else if (level.status === 'completed') {
      router.push({
        pathname: '/(tabs)/summary',
        params: {
          levelId: level.id.toString(),
          mode: 'history',
        },
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
            color={filled ? special.white : 'rgba(255,255,255,0.5)'}
          />
        ))}
      </View>
    );
  };

  const renderStatusIcon = (item: LevelItem) => {
    // Partie en cours : orange + flèche, quel que soit le statut (même niveau déjà complété)
    if (item.hasActiveGame) {
      return (
        <View style={styles.statusIconCurrent}>
          <Ionicons name="arrow-forward" size={18} color={isDark ? '#FFFFFF' : '#2B2C48'} />
        </View>
      );
    }
    switch (item.status) {
      case 'completed':
        return (
          <Ionicons name="checkmark-circle" size={34} color="#88D498" />
        );
      case 'current':
        return (
          <View style={styles.statusIconUnlocked}>
            <Ionicons name="lock-open-outline" size={16} color="#FFFFFF" />
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
    const hasActiveGame = item.hasActiveGame;
    const isCurrentUnlockedNoGame = isCurrent && !hasActiveGame;

    return (
      <TouchableOpacity
        style={[
          styles.levelRow,
          { backgroundColor: isLocked ? (isDark ? '#2A2D45' : '#D9D9D9') : theme.card },
          isLocked && styles.levelRowLocked,
          hasActiveGame && styles.levelRowCurrent,
          isCurrentUnlockedNoGame && styles.levelRowUnlockedNoGame,
          isCompleted && !hasActiveGame && styles.levelRowCompleted,
        ]}
        onPress={() => handleLevelPress(item)}
        activeOpacity={isLocked ? 1 : 0.7}
        disabled={isLocked}
      >
        <View style={styles.levelInfo}>
          <Text
            style={[
              styles.levelName,
              { color: isLocked ? (isDark ? 'rgba(255,255,255,0.4)' : '#2B2C48') : theme.text },
              isLocked && styles.levelNameLocked,
            ]}
          >
            Niveau {item.number ?? '?'}
          </Text>
          {isCompleted && !item.hasActiveGame && renderStars(item.stars)}
        </View>
        <View style={styles.statusIcon}>
          {renderStatusIcon(item)}
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
        ref={flatListRef}
        data={levels}
        renderItem={renderLevelItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 500);
        }}
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
  },
  // Completed level: no border
  levelRowCompleted: {
  },
  // Current level with active game: orange border
  levelRowCurrent: {
    borderColor: '#EFA667',
    borderWidth: 2,
  },
  // Unlocked level without active game (next to play): blue border
  levelRowUnlockedNoGame: {
    borderColor: '#9CD6FF',
    borderWidth: 2,
  },
  // Locked level
  levelRowLocked: {
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
  },
  levelNameLocked: {
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
    backgroundColor: CashouTheme.colors.light.accent,
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
  // Blue circle for unlocked (no active game)
  statusIconUnlocked: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9CD6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

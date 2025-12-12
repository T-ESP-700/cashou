import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useHeader } from '@/hooks/use-header';

interface LevelData {
  level: {
    id: number;
    title: string | null;
    number: number | null;
    description: string | null;
    duration: number | null;
    speed: number | null;
    startBalance: number | null;
  } | null;
  goals: {
    id: number;
    title: string | null;
    description: string | null;
  }[];
}

export default function GameGoalsScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const router = useRouter();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const { setOptions } = useHeader();

  // Ensure back button is always visible when this screen is focused
  useFocusEffect(
    useCallback(() => {
      setOptions({ showBackButton: true });
      return () => {
        // Optionally reset on unmount, but we keep it visible
      };
    }, [setOptions])
  );

  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLevelData = async () => {
      if (!levelId) {
        setError('ID du niveau manquant');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await trpcClient.level.getSummary.query({ id: parseInt(levelId, 10) });
        setLevelData(data as LevelData);
      } catch (err) {
        console.error('Error fetching level data:', err);
        setError('Erreur lors du chargement du niveau');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLevelData();
  }, [levelId]);

  const handleStart = () => {
    router.push({
      pathname: '/game/current',
      params: { levelId }
    });
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

  if (error || !levelData?.level) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            {error || 'Niveau non trouvé'}
          </Text>
        </View>
      </View>
    );
  }

  // Créer des objectifs par défaut si aucun n'est défini
  const displayGoals = levelData.goals.length > 0
    ? levelData.goals
    : [
        { id: 1, title: 'Objectif principal', description: 'Complétez le niveau avec succès' },
        { id: 2, title: 'Bonus', description: 'Atteignez les objectifs secondaires' }
      ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* Header */}
          <Text style={[styles.title, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            Niveau {levelData.level.number}
          </Text>

          <View style={[styles.separator, { backgroundColor: theme.text }]} />

          {/* Objectifs Title */}
          <Text style={[styles.sectionTitle, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            Objectifs
          </Text>

          {/* Goals Grid */}
          <View style={styles.goalsGrid}>
            {displayGoals.map((goal) => (
              <View
                key={goal.id}
                style={styles.goalCardWrapper}
              >
                <View style={[styles.goalCard, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
                  <Text style={[styles.goalTitle, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
                    {goal.title}
                  </Text>
                  <Text style={[styles.goalDescription, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
                    {goal.description || 'À accomplir'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.spacer} />

          {/* Start Button */}
          <TouchableOpacity
            style={[
              {
                ...CashouTheme.button.primary,
                backgroundColor: theme.card,
                borderColor: theme.border,
              }
            ]}
            onPress={handleStart}
            activeOpacity={CashouTheme.button.primary.activeOpacity}
          >
            <Text style={[
              {
                ...CashouTheme.button.primary.text,
                fontFamily: CashouTheme.fonts.subheading,
                color: theme.text,
              }
            ]}>
              C&apos;est parti
            </Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    padding: 16,
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
    // borderRadius: 16,
    // padding: 20,
    // borderWidth: 1,
    // minHeight: '85%',
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
  goalsGrid: {
    flexDirection: 'column',
  },
  goalCardWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  goalCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  goalTitle: {
    fontSize: 13,
    marginBottom: 8,
    opacity: 0.9,
  },
  goalDescription: {
    fontSize: 24,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
});

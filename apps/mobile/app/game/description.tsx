import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useHeaderOptions } from '@/hooks/use-header';

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
  events: {
    id: number;
    title: string | null;
    description: string | null;
  }[];
}

export default function GameDescriptionScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const router = useRouter();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  // Configure header for this screen
  useHeaderOptions({ showBackButton: true });

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

  const handleContinue = () => {
    router.push({
      pathname: '/game/goals',
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* Header */}
          <Text style={[styles.title, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            Niveau {levelData.level.number}
          </Text>

          <View style={[styles.separator, { backgroundColor: theme.text }]} />

          {/* Level Title */}
          <Text style={[styles.subtitle, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            {levelData.level.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
            {levelData.level.description || 'Aucune description disponible pour ce niveau.'}
          </Text>

          {/* Additional Info */}
          {levelData.level.startBalance && (
            <Text style={[styles.infoText, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
              Capital de départ : {levelData.level.startBalance}€
            </Text>
          )}

          <View style={styles.spacer} />

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              {
                ...CashouTheme.button.primary,
                backgroundColor: theme.card,
                borderColor: theme.border,
              }
            ]}
            onPress={handleContinue}
            activeOpacity={CashouTheme.button.primary.activeOpacity}
          >
            <Text style={[
              {
                ...CashouTheme.button.primary.text,
                fontFamily: CashouTheme.fonts.subheading,
                color: theme.text,
              }
            ]}>
              Continuer
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
    // borderRadius: CashouTheme.borderRadius.md,
    // padding: 20,
    // borderWidth: 1,
    // borderColor: CashouTheme.colors.light.border,
    // backgroundColor: CashouTheme.colors.light.card,
  },
  title: {
    fontSize: 24,
    marginBottom: 12,
  },
  separator: {
    height: 2,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
});

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme as useRNColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { CashouHeader } from '@/components/cashou-header';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';

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
  } | null;
}

export default function GameCurrentScreen() {
  const { levelId, gameId } = useLocalSearchParams<{ levelId: string; gameId?: string }>();
  const router = useRouter();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats simulées pour la démo (à remplacer par de vraies données)
  const [stats, setStats] = useState<GameStats>({
    level: 1,
    cash: 1000,
    timePassed: '0m',
    successes: 0,
  });

  // Assets simulés pour la démo (à remplacer par de vraies données)
  const [assets, setAssets] = useState<Asset[]>([
    { id: 1, title: 'Livret A', symbol: 'LA', rate: 2, description: 'Épargne sécurisée' },
    { id: 2, title: 'Apple', symbol: 'AAPL', rate: 7, description: 'Action technologique' },
    { id: 3, title: 'S&P 500', symbol: 'SPX', rate: 11, description: 'Indice boursier' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      if (!levelId) {
        setError('ID du niveau manquant');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
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
      } catch (err) {
        console.error('Error fetching level data:', err);
        setError('Erreur lors du chargement du niveau');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [levelId]);

  const handleAddAsset = () => {
    // TODO: Ouvrir un modal pour ajouter un asset
      router.push('/(tabs)/assets');
  };

  const handleAssetPress = (asset: Asset) => {
    // TODO: Ouvrir le détail de l'asset ou permettre l'achat
    console.log('Asset pressed:', asset.title);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <CashouHeader showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <CashouHeader showBackButton={true} />
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
      <CashouHeader showBackButton={true} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
    paddingBottom: 32,
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
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
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
});

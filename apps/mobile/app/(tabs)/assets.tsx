import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  useColorScheme as useRNColorScheme,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CashouHeader } from '@/components/cashou-header';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient, API_URL } from '@/lib/trpc';

// UI representation of an asset for display purposes
type AssetItem = {
  id: string;
  name: string;
  tags: string[];
  changePct: number;
};


export default function AssetsScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    let localError: unknown = null;
    try {
      setLoading(true);
      setError(null);
      const data: any[] = await trpcClient.asset.getAll.query();
      // Map backend Asset to UI AssetItem
      const mapped: AssetItem[] = (data || []).map((a: any) => ({
        id: String(a.id ?? a.symbol ?? a.title ?? Math.random()),
        name: String(a.title ?? a.symbol ?? 'Asset'),
        // Basic tags mapping (extend later if backend exposes richer fields)
        tags: [
          a?.symbol ? String(a.symbol) : null,
          a?.market?.title ? String(a.market.title) : null,
        ].filter(Boolean) as string[],
        // Map 'taux' field from database to 'changePct' for UI display
        changePct: typeof a?.taux === 'number' ? a.taux : 0,
      }));
      setAssets(mapped);
    } catch (e: any) {
      localError = e;
      console.error('[AssetsScreen] Failed to load assets from', API_URL, e);
      setError(e?.message ? String(e.message) : 'Impossible de charger les assets');
    } finally {
      setLoading(false);
    }
    return localError;
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const src = assets;
    if (!q) return src;
    return src.filter((a) => a.name.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)));
  }, [query, assets]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CashouHeader showBackButton={true} />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Section title */}
        <View style={[styles.sectionHeader, { backgroundColor: theme.secondary }]}>
          <Text style={[styles.title, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>Assets</Text>
          <View style={[styles.separator, { backgroundColor: isDark ? '#2F324A' : '#D3D7E0' }]} />
        </View>

        {/* Search bar */}
        <View style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={isDark ? '#C7CAD1' : '#6B7280'} />
          <TextInput
            placeholder="Rechercher"
            placeholderTextColor={isDark ? '#9BA1A6' : '#9CA3AF'}
            value={query}
            onChangeText={setQuery}
            style={[styles.input, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}
          />
        </View>

        {/* Status / Trending */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          {loading && (
            <Text style={{ color: theme.text, fontFamily: CashouTheme.fonts.body }}>Chargement…</Text>
          )}
          {error && !loading && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ color: '#DC2626', fontFamily: CashouTheme.fonts.body }}>
                {error}
              </Text>
              {__DEV__ && (
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                  URL API: {API_URL}
                </Text>
              )}
              <TouchableOpacity
                onPress={fetchAssets}
                style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFB472' }}
              >
                <Text style={{ color: '#1C1E33', fontFamily: CashouTheme.fonts.subheading }}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Trending */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Text style={[styles.trendingTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>Trendings</Text>

          <View style={styles.grid}>
            {filtered.map((asset) => (
              <AssetCard key={asset.id} asset={asset} isDark={isDark} />
            ))}
            {!loading && !error && filtered.length === 0 && (
              <Text style={{ color: theme.text, fontFamily: CashouTheme.fonts.body }}>
                Aucun asset trouvé
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AssetCard({ asset, isDark }: { asset: AssetItem; isDark: boolean }) {
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const positive = asset.changePct >= 0;
  return (
    <TouchableOpacity activeOpacity={0.8} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.cardTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>{asset.name}</Text>
      <View style={styles.tagsRow}>
        {asset.tags.map((t) => (
          <View key={t} style={[styles.tag, { backgroundColor: isDark ? '#2A2D45' : '#EFF1F5', borderColor: theme.border }]}> 
            <Text style={{ color: theme.text, fontSize: 12, fontFamily: CashouTheme.fonts.body }}>{t}</Text>
          </View>
        ))}
      </View>
      <View style={styles.changeRow}>
        <Ionicons name={positive ? 'caret-up' : 'caret-down'} size={18} color="#FFB472" />
        <Text style={{ marginLeft: 4, color: theme.text, fontFamily: CashouTheme.fonts.subheading }}>{Math.abs(asset.changePct)}%</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: CashouTheme.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 24 },
  separator: { height: 3, borderRadius: 2, marginTop: 8 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderRadius: CashouTheme.borderRadius.xl,
  },
  input: { flex: 1, fontSize: 16, marginLeft: 8 },
  trendingTitle: { fontSize: 20, marginTop: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  card: {
    width: '47%',
    padding: 12,
    borderRadius: CashouTheme.borderRadius.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, marginBottom: 6 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  changeRow: { flexDirection: 'row', alignItems: 'center' },
});

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  useColorScheme as useRNColorScheme,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { API_URL } from '@/lib/api-config';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';

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
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setIsOnAssetsScreen, activeGameInstanceId, pendingEventCompletion, setPendingEventCompletion, assetsScreenDepth, setAssetsScreenDepth, assetsScreenDepthRef, setPausedByAssets, pausedByAssets } = useNotifications();
  const { user } = useAuth();

  // Configure header for this screen
  useHeaderOptions({ showBackButton: true });

  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isSearching = useMemo(() => query.trim().length > 0, [query]);

  // Get params for trading
  const gameInstanceId = params?.gameInstanceId as string;
  const walletId = params?.walletId as string;

  // Use refs to track values needed during cleanup to avoid stale closure issues
  const activeGameInstanceIdRef = useRef(activeGameInstanceId);
  const userRef = useRef(user);
  const pendingEventCompletionRef = useRef(pendingEventCompletion);

  // Keep refs in sync with current values
  useEffect(() => {
    activeGameInstanceIdRef.current = activeGameInstanceId;
  }, [activeGameInstanceId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    pendingEventCompletionRef.current = pendingEventCompletion;
  }, [pendingEventCompletion]);

  // Pause game when entering assets screen, resume when leaving (only if no nested screens)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const pauseGame = async () => {
        const gameId = activeGameInstanceIdRef.current;
        const currentUser = userRef.current;
        const currentDepth = assetsScreenDepthRef.current;

        console.log('[AssetsScreen] ENTER - gameId:', gameId, 'user:', currentUser?.id, 'currentDepth:', currentDepth);

        // Increment depth counter (the ref is updated by setAssetsScreenDepth in the context)
        setAssetsScreenDepth((prev: number) => prev + 1);

        if (!gameId || !currentUser) {
          console.log('[AssetsScreen] ENTER - No gameId or user, skipping');
          return;
        }

        // Only pause if this is the first assets screen (depth was 0)
        if (currentDepth === 0) {
          try {
            // Check if game is already paused
            const gameInstance = await trpcClient.gameInstance.getById.query({ id: gameId });
            const wasAlreadyPaused = gameInstance?.isPaused ?? false;

            console.log('[AssetsScreen] ENTER - Game state: isPaused=', wasAlreadyPaused);

            if (!isMounted) return;

            // Only pause if not already paused
            if (!wasAlreadyPaused) {
              console.log('[AssetsScreen] Pausing game', gameId);
              await trpcClient.gameInstance.pause.mutate({ id: gameId });
              if (isMounted) setPausedByAssets(true);
              console.log('[AssetsScreen] ✅ Game paused by assets screen');
            } else {
              if (isMounted) setPausedByAssets(false);
              console.log('[AssetsScreen] Game already paused (not by us)');
            }
          } catch (error) {
            console.error('[AssetsScreen] Failed to pause game:', error);
            if (isMounted) setPausedByAssets(false);
          }
        }

        if (isMounted) setIsOnAssetsScreen(true);
      };

      pauseGame();

      return () => {
        isMounted = false;

        // Get current values from refs to avoid stale closures
        const gameId = activeGameInstanceIdRef.current;
        const currentUser = userRef.current;
        const pendingCompletion = pendingEventCompletionRef.current;

        console.log('[AssetsScreen] EXIT - gameId:', gameId, 'user:', currentUser?.id, 'currentDepth:', assetsScreenDepthRef.current);

        // Decrement depth (the ref is updated by setAssetsScreenDepth in the context)
        const newDepth = Math.max(0, assetsScreenDepthRef.current - 1);
        setAssetsScreenDepth(newDepth);

        console.log('[AssetsScreen] EXIT - newDepth:', newDepth);

        // If we're leaving all assets screens (depth becomes 0), wait a bit then check if we should resume
        // The delay allows asset-detail to increment depth if we're navigating there
        if (newDepth === 0 && gameId && currentUser) {
          console.log('[AssetsScreen] EXIT - Depth is 0, scheduling resume check in 150ms');

          setTimeout(async () => {
            console.log('[AssetsScreen] EXIT - Resume check executing, current depth:', assetsScreenDepthRef.current);

            // Check if depth is still 0 after the delay (no other assets screen took focus)
            if (assetsScreenDepthRef.current > 0) {
              console.log('[AssetsScreen] ⏸️  Another assets screen took focus (depth=' + assetsScreenDepthRef.current + '), not resuming');
              return;
            }

            console.log('[AssetsScreen] EXIT - No other assets screen, proceeding with resume');

            try {
              // Check current game state before resuming
              console.log('[AssetsScreen] EXIT - Fetching game state...');
              const gameInstance = await trpcClient.gameInstance.getById.query({ id: gameId });
              const isCurrentlyPaused = gameInstance?.isPaused ?? false;

              console.log('[AssetsScreen] EXIT - Game state: isPaused=', isCurrentlyPaused);

              // Resume if game is currently paused
              if (isCurrentlyPaused) {
                console.log('[AssetsScreen] 🎮 Resuming game', gameId);
                await trpcClient.gameInstance.resume.mutate({ id: gameId });
                console.log('[AssetsScreen] ✅ Game resumed successfully');
              } else {
                console.log('[AssetsScreen] ⚠️  Game is not paused, nothing to resume');
              }

              // If there's a pending event completion, complete it now
              if (pendingCompletion && pendingCompletion === gameId) {
                console.log('[AssetsScreen] 📋 Completing pending event for game', gameId);
                await trpcClient.gameInstance.completeEvent.mutate({ id: gameId });
                setPendingEventCompletion(null);
                console.log('[AssetsScreen] ✅ Event completed');
              }

              setPausedByAssets(false);
              setIsOnAssetsScreen(false);
            } catch (error) {
              console.error('[AssetsScreen] ❌ Failed to resume game or complete event:', error);
              // Clear pending completion on error to avoid retry loops
              if (pendingCompletion === gameId) {
                setPendingEventCompletion(null);
              }
              setPausedByAssets(false);
              setIsOnAssetsScreen(false);
            }
          }, 150); // Wait 150ms to see if another assets screen takes focus
        } else {
          console.log('[AssetsScreen] EXIT - Not leaving all assets (newDepth=' + newDepth + ' or no game/user)');
          setIsOnAssetsScreen(newDepth > 0);
        }
      };
    }, [setIsOnAssetsScreen, setPendingEventCompletion, setAssetsScreenDepth, setPausedByAssets, assetsScreenDepthRef])
  );

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
        changePct: typeof a?.rate === 'number' ? a.rate : 0,
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

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Section title */}
        {!isSearching && (
          <View style={[styles.sectionHeader, { backgroundColor: theme.secondary }]}>
            <Text style={[styles.title, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>Assets</Text>
            <View style={[styles.separator, { backgroundColor: isDark ? '#2F324A' : '#D3D7E0' }]} />
          </View>
        )}

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
          <Text style={[styles.trendingTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
            {isSearching ? 'Results' : 'Trendings'}
          </Text>

          <View style={styles.grid}>
            {filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isDark={isDark}
                router={router}
                gameInstanceId={gameInstanceId}
                walletId={walletId}
              />
            ))}
            {!loading && !error && filtered.length === 0 && (
              <Text style={{ color: theme.text, fontFamily: CashouTheme.fonts.body }}>
                {isSearching ? 'Aucun asset trouvé' : 'Aucun asset disponible'}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface AssetCardProps {
  asset: AssetItem;
  isDark: boolean;
  router: any;
  gameInstanceId?: string;
  walletId?: string;
}

function AssetCard({ asset, isDark, router, gameInstanceId, walletId }: AssetCardProps) {
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const positive = asset.changePct >= 0;

  const handlePress = () => {
    const params = new URLSearchParams({ id: asset.id });
    if (gameInstanceId) params.append('gameInstanceId', gameInstanceId);
    if (walletId) params.append('walletId', walletId);
    router.push(`/game/asset-detail?${params.toString()}`);
  };

  return (
    <TouchableOpacity activeOpacity={0.8} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handlePress}>
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

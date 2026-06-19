import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { API_URL } from '@/lib/api-config';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import { useHeader, useGameHeaderSubtitle } from '@/hooks/use-header';
import { useGameRealtime } from '@/hooks/use-game-realtime';
import { useOptionalLevel1Tour } from '@/contexts/level1-tour-context';
import { Level1TourStep, isLivretAAsset, isSavingsLivretOtherThanA, tourBubbleForStep } from '@/constants/level1-tour';

// UI representation of an asset for display purposes
type AssetItem = {
  id: string;
  name: string;
  tags: string[];
  changePct: number;
  submarketType?: string; // 'Savings' | 'Insurance' | 'Stock'
  available?: boolean; // false = verrouillé (pas encore débloqué dans la partie)
  unlockAfter?: string | null; // titre de l'event qui débloque l'asset
};


export default function AssetsScreen() {
  const { colors: theme, isDark, status } = useCashouTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const level1TourMain = useOptionalLevel1Tour();
  const { setIsOnAssetsScreen, activeGameInstanceId, pendingEventCompletion, setAssetsScreenDepth, assetsScreenDepthRef, setPausedByAssets, pausedByAssets } = useNotifications();
  const { user } = useAuth();

  // Keep the game header (Niveau X + date) — only ensure back button is shown
  const { setOptions: setHeaderOptions } = useHeader();
  const { formattedGameDate, state: realtimeState } = useGameRealtime();
  useGameHeaderSubtitle(formattedGameDate, realtimeState.isPaused, realtimeState.isEnded);

  useFocusEffect(
    useCallback(() => {
      setHeaderOptions({ showBackButton: true });
    }, [setHeaderOptions])
  );

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
  const pausedByAssetsRef = useRef(pausedByAssets);

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

  useEffect(() => {
    pausedByAssetsRef.current = pausedByAssets;
  }, [pausedByAssets]);

  const fetchAssets = useCallback(async () => {
    let localError: unknown = null;
    try {
      setLoading(true);
      setError(null);
      // En partie : getForGame annote chaque asset de sa disponibilité (verrou par niveau).
      // Hors partie : fallback sur getAll.
      const data: any[] = gameInstanceId
        ? await trpcClient.asset.getForGame.query({ gameInstanceId: parseInt(gameInstanceId) })
        : await trpcClient.asset.getAll.query();

      // Fetch current prices + daily change in one call per asset
      const priceData: Record<number, { price: number; changePct: number } | null> = {};
      if (gameInstanceId) {
        await Promise.all(
          (data || []).map(async (a: any) => {
            try {
              priceData[a.id] = await trpcClient.assetHistory.getPriceWithChange.query({
                assetId: a.id,
                gameInstanceId: parseInt(gameInstanceId),
              });
            } catch {
              priceData[a.id] = null;
            }
          })
        );
      }

      // Map backend Asset to UI AssetItem
      const mapped: AssetItem[] = (data || []).map((a: any) => {
        const pd = priceData[a.id];
        const subType = a?.submarket?.type as string | undefined;
        const isSavingsAsset = subType === 'SAVINGS';

        const changePct = isSavingsAsset
          ? (typeof a?.rate === 'number' ? a.rate : 0)
          : (pd?.changePct ?? (typeof a?.rate === 'number' ? a.rate : 0));
        const displayTag = isSavingsAsset
          ? (typeof a?.rate === 'number' ? `Taux: ${a.rate}%/an` : null)
          : (pd ? (pd.price / 100).toFixed(2) + ' EUR' : undefined);

        return {
          id: String(a.id ?? a.symbol ?? a.title ?? Math.random()),
          name: String(a.title ?? a.symbol ?? 'Asset'),
          tags: [
            a?.submarket?.title ? String(a.submarket.title) : null,
            displayTag ?? null,
          ].filter(Boolean) as string[],
          changePct,
          submarketType: subType,
          available: a.available !== false,
          unlockAfter: a?.unlock?.afterEventTitle ?? null,
        };
      });
      setAssets(mapped);
    } catch (e: any) {
      localError = e;
      console.error('[AssetsScreen] Failed to load assets from', API_URL, e);
      setError(e?.message ? String(e.message) : 'Impossible de charger les assets');
    } finally {
      setLoading(false);
    }
    return localError;
  }, [gameInstanceId]);

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

        // Refresh prices after pause is effective (so backend uses paused time)
        await fetchAssets();
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
              const isWaitingForEventResume = pendingCompletion === gameId;

              // Only resume if WE paused the game and we're not waiting for an explicit event resume.
              if (pausedByAssetsRef.current && !isWaitingForEventResume) {
                console.log('[AssetsScreen] 🎮 Resuming game (pausedByAssets=true)', gameId);
                await trpcClient.gameInstance.resume.mutate({ id: gameId });
                console.log('[AssetsScreen] ✅ Game resumed successfully');
              } else {
                console.log('[AssetsScreen] ⏸️  Game stays paused after assets close');
              }

              setPausedByAssets(false);
              setIsOnAssetsScreen(false);
            } catch (error) {
              console.error('[AssetsScreen] ❌ Failed to resume game:', error);
              setPausedByAssets(false);
              setIsOnAssetsScreen(false);
            }
          }, 150); // Wait 150ms to see if another assets screen takes focus
        } else {
          console.log('[AssetsScreen] EXIT - Not leaving all assets (newDepth=' + newDepth + ' or no game/user)');
          setIsOnAssetsScreen(newDepth > 0);
        }
      };
    }, [setIsOnAssetsScreen, setAssetsScreenDepth, setPausedByAssets, assetsScreenDepthRef, fetchAssets])
  );


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const src = assets;
    if (!q) return src;
    return src.filter((a) => a.name.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)));
  }, [query, assets]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {level1TourMain?.sessionActive &&
          level1TourMain.step === Level1TourStep.PostEventOpenAssets && (
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
              <Text style={{ color: theme.text, fontFamily: CashouTheme.fonts.body, fontSize: 14, lineHeight: 20 }}>
                {tourBubbleForStep(Level1TourStep.PostEventOpenAssets, level1TourMain.eventPhase)}
              </Text>
            </View>
          )}
          {/* Section title */}
        {!isSearching && (
          <View style={[styles.sectionHeader, { backgroundColor: theme.secondary }]}>
            <Text style={[styles.title, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>Assets</Text>
            <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />
          </View>
        )}

        {/* Search bar */}
        <View style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.iconMuted} />
          <TextInput
            placeholder="Rechercher"
            placeholderTextColor={theme.iconMuted}
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
              <Text style={{ color: status.error, fontFamily: CashouTheme.fonts.body }}>
                {error}
              </Text>
              {__DEV__ && (
                <Text style={{ color: theme.iconMuted, fontSize: 12, marginTop: 4 }}>
                  URL API: {API_URL}
                </Text>
              )}
              <TouchableOpacity
                onPress={fetchAssets}
                style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.accent }}
              >
                <Text style={{ color: theme.text, fontFamily: CashouTheme.fonts.subheading }}>Réessayer</Text>
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
  const level1Tour = useOptionalLevel1Tour();

  const locked = asset.available === false;

  const handlePress = () => {
    if (locked) return; // asset verrouillé : non cliquable
    const t = level1Tour;
    if (t?.sessionActive && t.step === Level1TourStep.SelectLivretAForWithdraw) {
      if (!isLivretAAsset({ title: asset.name })) return;
    }
    if (t?.sessionActive && t.step === Level1TourStep.WithdrawAndMoveToOtherLivret) {
      if (
        !isSavingsLivretOtherThanA({
          title: asset.name,
          symbol: null,
          submarket: { type: asset.submarketType ?? null },
        })
      ) {
        return;
      }
    }
    const params = new URLSearchParams({ id: asset.id });
    if (gameInstanceId) params.append('gameInstanceId', gameInstanceId);
    if (walletId) params.append('walletId', walletId);
    router.push(`/game/asset-detail?${params.toString()}`);
  };

  const cardDisabled = Boolean(
    level1Tour?.sessionActive &&
      ((level1Tour.step === Level1TourStep.SelectLivretAForWithdraw &&
        !isLivretAAsset({ title: asset.name })) ||
        (level1Tour.step === Level1TourStep.WithdrawAndMoveToOtherLivret &&
          !isSavingsLivretOtherThanA({
            title: asset.name,
            symbol: null,
            submarket: { type: asset.submarketType ?? null },
          })))
  );

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: (cardDisabled || locked) ? 0.4 : 1 }]}
      disabled={cardDisabled || locked}
      onPress={handlePress}
    >
      <Text style={[styles.cardTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>{asset.name}</Text>
      {locked ? (
        <View style={styles.changeRow}>
          <Ionicons name="lock-closed" size={15} color={theme.text} />
          <Text style={{ marginLeft: 6, color: theme.text, fontSize: 12, fontFamily: CashouTheme.fonts.body, flexShrink: 1 }}>
            {asset.unlockAfter ? `Disponible après « ${asset.unlockAfter} »` : 'Bientôt disponible'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.tagsRow}>
            {asset.tags.map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: theme.secondary, borderColor: theme.borderLight }]}>
                <Text style={{ color: theme.text, fontSize: 12, fontFamily: CashouTheme.fonts.body }}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={styles.changeRow}>
            {asset.submarketType === 'SAVINGS' ? (
              <>
                <Ionicons name="lock-closed" size={16} color="#4CAF50" />
                <Text style={{ marginLeft: 4, color: '#4CAF50', fontFamily: CashouTheme.fonts.subheading }}>{asset.changePct}%/an garanti</Text>
              </>
            ) : (
              <>
                <Ionicons name={positive ? 'caret-up' : 'caret-down'} size={18} color="#FFB472" />
                <Text style={{ marginLeft: 4, color: theme.text, fontFamily: CashouTheme.fonts.subheading }}>{Math.abs(asset.changePct).toFixed(2)}%</Text>
              </>
            )}
          </View>
        </>
      )}
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

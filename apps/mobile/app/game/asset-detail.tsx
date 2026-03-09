import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme as useRNColorScheme,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import { PriceChart } from '@/components/price-chart';

export default function AssetDetailScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { activeGameInstanceId, pendingEventCompletion, setPendingEventCompletion, setAssetsScreenDepth, assetsScreenDepthRef, setIsOnAssetsScreen, setPausedByAssets } = useNotifications();
  const { user } = useAuth();

  // Configure header for this screen
  useHeaderOptions({ showBackButton: true });

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentHolding, setCurrentHolding] = useState(0);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  // Get params from URL
  const assetIdParam = params?.id;
  const assetId = Array.isArray(assetIdParam) ? assetIdParam[0] : assetIdParam;
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

  // Track depth for nested navigation
  useFocusEffect(
    useCallback(() => {
      console.log('[AssetDetailScreen] ENTER - currentDepth:', assetsScreenDepthRef.current);

      // Increment depth when entering asset-detail (the ref is updated by setAssetsScreenDepth in the context)
      setAssetsScreenDepth((prev: number) => prev + 1);

      return () => {
        // Get current values from refs to avoid stale closures
        const gameId = activeGameInstanceIdRef.current;
        const currentUser = userRef.current;
        const pendingCompletion = pendingEventCompletionRef.current;

        console.log('[AssetDetailScreen] EXIT - gameId:', gameId, 'user:', currentUser?.id, 'currentDepth:', assetsScreenDepthRef.current);

        // Decrement depth when leaving asset-detail (the ref is updated by setAssetsScreenDepth in the context)
        const newDepth = Math.max(0, assetsScreenDepthRef.current - 1);
        setAssetsScreenDepth(newDepth);

        console.log('[AssetDetailScreen] EXIT - newDepth:', newDepth);

        // If we're leaving all assets screens (depth = 0), wait a bit then check if we should resume
        // The delay allows assets.tsx to increment depth if we're navigating back there
        if (newDepth === 0 && gameId && currentUser) {
          console.log('[AssetDetailScreen] EXIT - Depth is 0, scheduling resume check in 150ms');

          setTimeout(async () => {
            console.log('[AssetDetailScreen] EXIT - Resume check executing, current depth:', assetsScreenDepthRef.current);

            // Check if depth is still 0 after the delay (no other assets screen took focus)
            if (assetsScreenDepthRef.current > 0) {
              console.log('[AssetDetailScreen] ⏸️  Another assets screen took focus (depth=' + assetsScreenDepthRef.current + '), not resuming');
              return;
            }

            console.log('[AssetDetailScreen] EXIT - No other assets screen, proceeding with resume');

            try {
              // Check current game state before resuming
              console.log('[AssetDetailScreen] EXIT - Fetching game state...');
              const gameInstance = await trpcClient.gameInstance.getById.query({ id: gameId });
              const isCurrentlyPaused = gameInstance?.isPaused ?? false;

              console.log('[AssetDetailScreen] EXIT - Game state: isPaused=', isCurrentlyPaused);

              // Resume if game is currently paused
              if (isCurrentlyPaused) {
                console.log('[AssetDetailScreen] 🎮 Resuming game', gameId);
                await trpcClient.gameInstance.resume.mutate({ id: gameId });
                console.log('[AssetDetailScreen] ✅ Game resumed successfully');
              } else {
                console.log('[AssetDetailScreen] ⚠️  Game is not paused, nothing to resume');
              }

              // Complete pending event if any
              if (pendingCompletion && pendingCompletion === gameId) {
                console.log('[AssetDetailScreen] 📋 Completing pending event for game', gameId);
                await trpcClient.gameInstance.completeEvent.mutate({ id: gameId });
                setPendingEventCompletion(null);
                console.log('[AssetDetailScreen] ✅ Event completed');
              }

              setPausedByAssets(false);
              setIsOnAssetsScreen(false);
            } catch (error) {
              console.error('[AssetDetailScreen] ❌ Failed to resume game or complete event:', error);
              if (pendingCompletion === gameId) {
                setPendingEventCompletion(null);
              }
              setPausedByAssets(false);
              setIsOnAssetsScreen(false);
            }
          }, 150); // Wait 150ms to see if another assets screen takes focus
        } else {
          console.log('[AssetDetailScreen] EXIT - Not leaving all assets (newDepth=' + newDepth + ' or no game/user)');
          setIsOnAssetsScreen(newDepth > 0);
        }
      };
    }, [setAssetsScreenDepth, setPendingEventCompletion, setIsOnAssetsScreen, setPausedByAssets, assetsScreenDepthRef])
  );

  useEffect(() => {
    const fetchAsset = async () => {
      if (!assetId) {
        setError('ID de l\'asset manquant');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await trpcClient.asset.getById.query({ id: parseInt(assetId) });
        setAsset(data);

        // Fetch price history with event coefs applied
        try {
          if (gameInstanceId) {
            const history = await trpcClient.assetHistory.getForGame.query({
              assetId: parseInt(assetId),
              gameInstanceId: parseInt(gameInstanceId),
            });
            setPriceHistory(history);
          } else if (data?.assetHistories) {
            // No game context — show raw history
            setPriceHistory(data.assetHistories);
          }
        } catch (e) {
          console.error('[AssetDetail] Failed to load price history:', e);
          // Fallback to raw included data
          if (data?.assetHistories) setPriceHistory(data.assetHistories);
        }

        // Fetch current holding value (price-based) via portfolio endpoint
        if (walletId && gameInstanceId) {
          try {
            const portfolio = await trpcClient.investment.getPortfolio.query({
              walletId: parseInt(walletId),
              gameInstanceId: parseInt(gameInstanceId),
            });
            const item = portfolio.items.find((i: any) => i.holding.assetId === parseInt(assetId));
            if (item) {
              setCurrentHolding(Math.round(item.totalValue));
            }
          } catch (e) {
            console.error('[AssetDetail] Failed to load portfolio:', e);
            // Fallback to raw holding quantity
            try {
              const holdings = await trpcClient.holding.getByWallet.query({ walletId: parseInt(walletId) });
              const holding = holdings.find((h: any) => h.assetId === parseInt(assetId));
              if (holding) setCurrentHolding(Number(holding.quantity) || 0);
            } catch {}
          }
        }
      } catch (e: any) {
        console.error('[AssetDetail] Failed to load asset:', e);
        setError(e?.message ? String(e.message) : 'Impossible de charger l\'asset');
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [assetId, walletId, gameInstanceId]);

  const handleBuy = () => {
    router.push({
      pathname: '/game/transaction',
      params: {
        assetId,
        type: 'buy',
        gameInstanceId,
        walletId,
      },
    });
  };

  const handleSell = () => {
    router.push({
      pathname: '/game/transaction',
      params: {
        assetId,
        type: 'sell',
        gameInstanceId,
        walletId,
      },
    });
  };

  const canTrade = gameInstanceId && walletId;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: canTrade ? 100 : 32 }]}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
              Chargement...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: '#DC2626', fontFamily: CashouTheme.fonts.body }]}>
              {error}
            </Text>
          </View>
        ) : asset ? (
          <>
            {/* Header Section with Title and Symbol */}
            <View style={[styles.headerSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.assetTitle, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
                {asset.title || 'Sans titre'}
              </Text>
              {asset.symbol && (
                <View style={[styles.symbolBadge, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.symbolText, { fontFamily: CashouTheme.fonts.subheading }]}>
                    {asset.symbol}
                  </Text>
                </View>
              )}
            </View>

            {/* Current Holding Section */}
            {currentHolding > 0 && (
              <View style={[styles.section, styles.holdingSection, { backgroundColor: '#4CAF5020', borderColor: '#4CAF50' }]}>
                <View style={styles.holdingHeader}>
                  <Ionicons name="wallet" size={24} color="#4CAF50" />
                  <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading, marginBottom: 0, marginLeft: 8 }]}>
                    Votre position
                  </Text>
                </View>
                <Text style={[styles.holdingValue, { color: '#4CAF50', fontFamily: CashouTheme.fonts.heading }]}>
                  {Math.round(currentHolding)} EUR
                </Text>
              </View>
            )}

            {/* Price Chart Section */}
            {priceHistory.length >= 2 && (
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Cours
                </Text>
                <PriceChart data={priceHistory} isDark={isDark} theme={theme} />
              </View>
            )}

            {/* Current Price Section — computed from price history */}
            {priceHistory.length >= 2 && (() => {
              const sorted = [...priceHistory].sort((a: any, b: any) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              const currentPrice = Number(sorted[sorted.length - 1].value) / 100;
              const previousPrice = Number(sorted[sorted.length - 2].value) / 100;
              const dailyChange = currentPrice - previousPrice;
              const dailyChangePercent = (dailyChange / previousPrice) * 100;
              const isUp = dailyChange >= 0;
              return (
                <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                    Prix actuel
                  </Text>
                  <View style={styles.rateContainer}>
                    <Text style={[styles.rateValue, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
                      {currentPrice.toFixed(2)} EUR
                    </Text>
                  </View>
                  <View style={[styles.rateContainer, { marginTop: 4 }]}>
                    <Ionicons
                      name={isUp ? 'caret-up' : 'caret-down'}
                      size={16}
                      color={isUp ? '#4CAF50' : '#F44336'}
                    />
                    <Text style={[{
                      fontSize: 14,
                      marginLeft: 4,
                      color: isUp ? '#4CAF50' : '#F44336',
                      fontFamily: CashouTheme.fonts.body,
                    }]}>
                      {isUp ? '+' : ''}{dailyChange.toFixed(2)} EUR ({isUp ? '+' : ''}{dailyChangePercent.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Description Section */}
            {asset.description && (
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Description
                </Text>
                <Text style={[styles.descriptionText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                  {asset.description}
                </Text>
              </View>
            )}

            {/* Market Information */}
            {asset.market && (
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Marché
                </Text>
                <Text style={[styles.infoText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                  {asset.market.title || 'Non spécifié'}
                </Text>
                {asset.market.description && (
                  <Text style={[styles.infoSubtext, { color: theme.text, opacity: 0.7, fontFamily: CashouTheme.fonts.body }]}>
                    {asset.market.description}
                  </Text>
                )}
              </View>
            )}

            {/* Submarket Information */}
            {asset.submarket && (
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Sous-marché
                </Text>
                <Text style={[styles.infoText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                  {asset.submarket.title || 'Non spécifié'}
                </Text>
                {asset.submarket.description && (
                  <Text style={[styles.infoSubtext, { color: theme.text, opacity: 0.7, fontFamily: CashouTheme.fonts.body }]}>
                    {asset.submarket.description}
                  </Text>
                )}
              </View>
            )}

            {/* Field Information */}
            {asset.field && (
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Domaine
                </Text>
                <Text style={[styles.infoText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                  {asset.field.name || 'Non spécifié'}
                </Text>
              </View>
            )}

            {/* Additional Information Section */}
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                Informations complémentaires
              </Text>

              {asset.createdAt && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.text, opacity: 0.7, fontFamily: CashouTheme.fonts.body }]}>
                    Créé le:
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                    {new Date(asset.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              )}

              {asset.updatedAt && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.text, opacity: 0.7, fontFamily: CashouTheme.fonts.body }]}>
                    Mis à jour le:
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                    {new Date(asset.updatedAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              )}
            </View>

            {/* Asset History */}
            {asset.assetHistories && asset.assetHistories.length > 0 && (
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Historique
                </Text>
                <Text style={[styles.infoText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                  {asset.assetHistories.length} entrée(s) historique
                </Text>
              </View>
            )}

            {/* Transactions */}
            {asset.transactions && asset.transactions.length > 0 && (
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Transactions
                </Text>
                <Text style={[styles.infoText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                  {asset.transactions.length} transaction(s)
                </Text>
              </View>
            )}

            {/* Events */}
            {asset.eventAssets && asset.eventAssets.length > 0 && (
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Événements
                </Text>
                <Text style={[styles.infoText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                  {asset.eventAssets.length} événement(s) lié(s)
                </Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* Bottom Buy/Sell Buttons */}
      {canTrade && asset && !loading && !error && (
        <View style={[styles.bottomButtons, { paddingBottom: insets.bottom + 16, backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.buyButton]}
            onPress={handleBuy}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-down-circle" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Acheter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.sellButton,
              currentHolding === 0 && styles.actionButtonDisabled,
            ]}
            onPress={handleSell}
            activeOpacity={0.8}
            disabled={currentHolding === 0}
          >
            <Ionicons name="arrow-up-circle" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Vendre</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  headerSection: {
    padding: 20,
    borderRadius: CashouTheme.borderRadius.lg,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  assetTitle: {
    fontSize: 28,
    marginBottom: 12,
    textAlign: 'center',
  },
  symbolBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  symbolText: {
    fontSize: 16,
    color: '#1C1E33',
  },
  section: {
    padding: 16,
    borderRadius: CashouTheme.borderRadius.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateValue: {
    fontSize: 32,
    marginLeft: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoSubtext: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
  },
  holdingSection: {
    alignItems: 'center',
  },
  holdingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  holdingValue: {
    fontSize: 28,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buyButton: {
    backgroundColor: '#4CAF50',
  },
  sellButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

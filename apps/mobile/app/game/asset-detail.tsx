import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useNotifications } from '@/hooks/use-notifications';
import { useHeader, useGameHeaderSubtitle } from '@/hooks/use-header';
import { useGameRealtime } from '@/hooks/use-game-realtime';
import { PriceChart } from '@/components/price-chart';
import { ActionPillButton } from '@/components/ui/ActionPillButton';
import { useOptionalLevel1Tour } from '@/contexts/level1-tour-context';
import {
  Level1TourStep,
  isLivretAAsset,
  isSavingsLivretOtherThanA,
  tourBubbleForStep,
  tourStepHeadline,
} from '@/constants/level1-tour';
import { Level1TourCallout } from '@/components/level1-tour-callout';

export default function AssetDetailScreen() {
  const { colors: theme, isDark, status } = useCashouTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { setAssetsScreenDepth, assetsScreenDepthRef } = useNotifications();
  const level1Tour = useOptionalLevel1Tour();

  // Keep the game header (Niveau X + date) — only ensure back button is shown
  const { setOptions: setHeaderOptions } = useHeader();
  const { formattedGameDate, state: realtimeState } = useGameRealtime();
  useGameHeaderSubtitle(formattedGameDate, realtimeState.isPaused, realtimeState.isEnded);

  useFocusEffect(
    useCallback(() => {
      setHeaderOptions({ showBackButton: true });
    }, [setHeaderOptions])
  );

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

  // Track depth for nested navigation — asset-detail only manages the depth counter.
  // Resume logic is handled exclusively by assets.tsx (the screen that paused the game).
  useFocusEffect(
    useCallback(() => {
      console.log('[AssetDetailScreen] ENTER - currentDepth:', assetsScreenDepthRef.current);
      setAssetsScreenDepth((prev: number) => prev + 1);

      return () => {
        const newDepth = Math.max(0, assetsScreenDepthRef.current - 1);
        setAssetsScreenDepth(newDepth);
        console.log('[AssetDetailScreen] EXIT - newDepth:', newDepth);
      };
    }, [setAssetsScreenDepth, assetsScreenDepthRef])
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
  const submarketType = asset?.submarket?.type; // 'SAVINGS' | 'INSURANCE' | 'STOCK'
  const isSavings = submarketType === 'SAVINGS';
  const isStock = submarketType === 'STOCK';

  useEffect(() => {
    if (!asset || !level1Tour?.sessionActive) return;
    const t = level1Tour;
    if (t.step === Level1TourStep.DepositOnLivretA && !isLivretAAsset(asset)) {
      void t.abortTour();
      return;
    }
    if (t.step === Level1TourStep.SelectLivretAForWithdraw && !isLivretAAsset(asset)) {
      void t.abortTour();
      return;
    }
    if (t.step === Level1TourStep.WithdrawAndMoveToOtherLivret) {
      const okOther = isSavingsLivretOtherThanA(asset);
      const okA = isLivretAAsset(asset);
      if (!okOther && !okA) void t.abortTour();
    }
  }, [asset?.id, level1Tour?.sessionActive, level1Tour?.step]);

  const livretAAsset = asset ? isLivretAAsset(asset) : false;
  const tourDeposit = level1Tour?.sessionActive && level1Tour.step === Level1TourStep.DepositOnLivretA;
  const tourWithdrawA = level1Tour?.sessionActive && level1Tour.step === Level1TourStep.SelectLivretAForWithdraw;
  const tourMove = level1Tour?.sessionActive && level1Tour.step === Level1TourStep.WithdrawAndMoveToOtherLivret;

  const tourFocusedPillStyle = useMemo(
    () =>
      Platform.OS === 'android'
        ? { borderWidth: 3, borderColor: '#FFFFFF', elevation: 20 }
        : {
            borderWidth: 3,
            borderColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
          },
    [],
  );

  // Badge colors per submarket type (same as current.tsx)
  const getSubmarketBadgeStyle = (submarketTitle: string) => {
    const lower = submarketTitle.toLowerCase();
    if (lower.includes('epargne') || lower.includes('épargne')) return { bg: '#C8E6C9', text: '#388E3C' };
    if (lower.includes('bourse') || lower.includes('action')) return { bg: '#E1D5F0', text: '#6A1B9A' };
    if (lower.includes('crypto')) return { bg: '#FFE0B2', text: '#E65100' };
    if (lower.includes('immobilier')) return { bg: '#B3E5FC', text: '#0277BD' };
    return { bg: '#E0E0E0', text: '#424242' };
  };
  const badgeStyle = asset?.submarket?.title
    ? getSubmarketBadgeStyle(asset.submarket.title)
    : { bg: theme.accent, text: '#1C1E33' };

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
            <Text style={[styles.errorText, { color: status.error, fontFamily: CashouTheme.fonts.body }]}>
              {error}
            </Text>
          </View>
        ) : asset ? (
          <>
            {tourDeposit && (
              <Level1TourCallout
                title={tourStepHeadline(Level1TourStep.DepositOnLivretA)}
                message={tourBubbleForStep(Level1TourStep.DepositOnLivretA, level1Tour?.eventPhase ?? 0)}
              />
            )}
            {tourWithdrawA && livretAAsset && (
              <Level1TourCallout
                title={tourStepHeadline(Level1TourStep.SelectLivretAForWithdraw)}
                message={tourBubbleForStep(Level1TourStep.SelectLivretAForWithdraw, level1Tour?.eventPhase ?? 0)}
              />
            )}
            {tourMove && (
              <Level1TourCallout
                title={tourStepHeadline(Level1TourStep.WithdrawAndMoveToOtherLivret)}
                message={tourBubbleForStep(Level1TourStep.WithdrawAndMoveToOtherLivret, level1Tour?.eventPhase ?? 0)}
              />
            )}
            {/* Header Section with Title and Symbol */}
            <View style={[styles.headerSection, { backgroundColor: theme.card }]}>
              <Text style={[styles.assetTitle, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
                {asset.title || 'Sans titre'}
              </Text>
              {asset.submarket?.title && (
                <View style={[styles.assetBadge, { backgroundColor: badgeStyle.bg }]}>
                  <Text style={[styles.assetBadgeText, { color: badgeStyle.text }]}>
                    {asset.submarket.title}
                  </Text>
                </View>
              )}
            </View>

            {/* Current Holding Section */}
            {currentHolding > 0 && (
              <View style={[styles.section, styles.holdingSection, { backgroundColor: '#4CAF5020' }]}>
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

            {/* Savings: Rate & Cap info instead of chart */}
            {isSavings && (
              <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Conditions
                </Text>
                {asset.rate != null && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.text, opacity: 0.7, fontFamily: CashouTheme.fonts.body }]}>
                      Taux annuel garanti
                    </Text>
                    <Text style={[styles.infoValue, { color: '#4CAF50', fontFamily: CashouTheme.fonts.heading }]}>
                      {asset.rate}%
                    </Text>
                  </View>
                )}
                {asset.maxAmount != null && (
                  <View style={[styles.infoRow, { marginTop: 8 }]}>
                    <Text style={[styles.infoLabel, { color: theme.text, opacity: 0.7, fontFamily: CashouTheme.fonts.body }]}>
                      Plafond
                    </Text>
                    <Text style={[styles.infoValue, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
                      {Number(asset.maxAmount).toLocaleString('fr-FR')} EUR
                    </Text>
                  </View>
                )}
                {asset.minAmount != null && (
                  <View style={[styles.infoRow, { marginTop: 8 }]}>
                    <Text style={[styles.infoLabel, { color: theme.text, opacity: 0.7, fontFamily: CashouTheme.fonts.body }]}>
                      Dépôt minimum
                    </Text>
                    <Text style={[styles.infoValue, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
                      {Number(asset.minAmount).toLocaleString('fr-FR')} EUR
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Price Chart Section — only for non-savings assets */}
            {!isSavings && priceHistory.length >= 2 && (
              <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Cours
                </Text>
                <PriceChart data={priceHistory} isDark={isDark} theme={theme} />
              </View>
            )}

            {/* Current Price Section — only for non-savings assets */}
            {!isSavings && priceHistory.length >= 2 && (() => {
              const sorted = [...priceHistory].sort((a: any, b: any) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              const currentPrice = Number(sorted[sorted.length - 1].value) / 100;
              const previousPrice = Number(sorted[sorted.length - 2].value) / 100;
              const dailyChange = currentPrice - previousPrice;
              const dailyChangePercent = (dailyChange / previousPrice) * 100;
              const isUp = dailyChange >= 0;
              return (
                <View style={[styles.section, { backgroundColor: theme.card }]}>
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
              <View style={[styles.section, { backgroundColor: theme.card }]}>
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
              <View style={[styles.section, { backgroundColor: theme.card }]}>
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
              <View style={[styles.section, { backgroundColor: theme.card }]}>
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
              <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Domaine
                </Text>
                <Text style={[styles.infoText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
                  {asset.field.name || 'Non spécifié'}
                </Text>
              </View>
            )}

            {/* Additional Information Section */}
            <View style={[styles.section, { backgroundColor: theme.card }]}>
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
              <View style={[styles.section, { backgroundColor: theme.card }]}>
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
              <View style={[styles.section, { backgroundColor: theme.card }]}>
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
              <View style={[styles.section, { backgroundColor: theme.card }]}>
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

      {/* Bottom Buy/Sell Floating Buttons */}
      {canTrade && asset && !loading && !error && (
        <View style={[styles.bottomButtons, { paddingBottom: insets.bottom + 8 }]}>
          <ActionPillButton
            label={isSavings ? 'Déposer' : 'Acheter'}
            iconName={isSavings ? 'download-outline' : 'arrow-down-circle'}
            onPress={handleBuy}
            disabled={
              Boolean((tourWithdrawA && livretAAsset) || (tourMove && livretAAsset))
            }
            style={tourDeposit && livretAAsset ? tourFocusedPillStyle : undefined}
          />
          <ActionPillButton
            label={isSavings ? 'Retirer' : 'Vendre'}
            iconName={isSavings ? 'arrow-up-circle' : 'arrow-up-circle'}
            onPress={handleSell}
            disabled={
              currentHolding === 0 ||
              Boolean((tourDeposit && livretAAsset) || (tourMove && !livretAAsset && isSavings))
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 100,
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
    borderRadius: 22,
    marginBottom: 8,
    alignItems: 'center',
  },
  assetTitle: {
    fontSize: 28,
    marginBottom: 12,
    textAlign: 'center',
  },
  assetBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  assetBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Anybody',
  },
  section: {
    padding: 16,
    borderRadius: 22,
    marginBottom: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
});

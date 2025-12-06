import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme as useRNColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';

export default function AssetDetailScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const router = useRouter();
  const params = useLocalSearchParams();

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get asset ID from URL params
  const assetIdParam = params?.id;
  const assetId = Array.isArray(assetIdParam) ? assetIdParam[0] : assetIdParam;

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
      } catch (e: any) {
        console.error('[AssetDetail] Failed to load asset:', e);
        setError(e?.message ? String(e.message) : 'Impossible de charger l\'asset');
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [assetId]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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

            {/* Rate Section */}
            {typeof asset.taux === 'number' && (
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Taux
                </Text>
                <View style={styles.rateContainer}>
                  <Ionicons
                    name={asset.taux >= 0 ? 'caret-up' : 'caret-down'}
                    size={24}
                    color="#FFB472"
                  />
                  <Text style={[styles.rateValue, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
                    {Math.abs(asset.taux)}%
                  </Text>
                </View>
              </View>
            )}

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
});

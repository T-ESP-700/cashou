import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useColorScheme as useRNColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useHeaderOptions } from '@/hooks/use-header';

type TransactionType = 'buy' | 'sell';

interface AssetData {
  id: number;
  title: string | null;
  symbol: string | null;
  rate: number | null;
  maxAmount: number | null;
  minAmount: number | null;
}

export default function TransactionScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  useHeaderOptions({ showBackButton: true });

  // Params
  const assetId = params.assetId ? parseInt(params.assetId as string, 10) : null;
  const type = (params.type as TransactionType) || 'buy';
  const gameInstanceId = params.gameInstanceId ? parseInt(params.gameInstanceId as string, 10) : null;
  const walletId = params.walletId ? parseInt(params.walletId as string, 10) : null;

  // State
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [currentHolding, setCurrentHolding] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick amount buttons
  const quickAmounts = [10, 50, 100, 500, 1000];

  useEffect(() => {
    const fetchData = async () => {
      if (!assetId || !walletId) {
        setError('Parametres manquants');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch asset
        const assetData = await trpcClient.asset.getById.query({ id: assetId });
        setAsset(assetData as AssetData);

        // Fetch wallet balance
        const wallet = await trpcClient.wallet.getById.query({ id: walletId });
        if (wallet) {
          setWalletBalance(Number(wallet.amount) || 0);
        }

        // Fetch current holding for this asset (for sell)
        if (type === 'sell') {
          try {
            const holdings = await trpcClient.holding.getByWallet.query({ walletId });
            const holding = holdings.find((h: any) => h.assetId === assetId);
            if (holding) {
              setCurrentHolding(Number(holding.quantity) || 0);
            }
          } catch (e) {
            console.error('Error fetching holdings:', e);
          }
        }
      } catch (e: any) {
        console.error('Error fetching data:', e);
        setError('Erreur lors du chargement des donnees');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [assetId, walletId, type]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleMaxAmount = () => {
    if (type === 'buy') {
      // For buy: use wallet balance, respecting asset max if set
      let maxBuy = walletBalance;
      if (asset?.maxAmount) {
        const remaining = Number(asset.maxAmount) - currentHolding;
        maxBuy = Math.min(walletBalance, remaining);
      }
      setAmount(Math.floor(maxBuy).toString());
    } else {
      // For sell: use current holding
      setAmount(Math.floor(currentHolding).toString());
    }
  };

  const validateAmount = (): string | null => {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return 'Veuillez entrer un montant valide';
    }

    if (type === 'buy') {
      if (numAmount > walletBalance) {
        return `Solde insuffisant. Disponible: ${Math.round(walletBalance)} EUR`;
      }
      if (asset?.minAmount && numAmount < Number(asset.minAmount)) {
        return `Montant minimum: ${asset.minAmount} EUR`;
      }
      if (asset?.maxAmount) {
        const maxAllowed = Number(asset.maxAmount) - currentHolding;
        if (numAmount > maxAllowed) {
          return `Plafond atteint. Maximum: ${Math.round(maxAllowed)} EUR`;
        }
      }
    } else {
      if (numAmount > currentHolding) {
        return `Quantite insuffisante. Disponible: ${Math.round(currentHolding)} EUR`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateAmount();
    if (validationError) {
      Alert.alert('Erreur', validationError);
      return;
    }

    if (!assetId || !walletId || !gameInstanceId) {
      Alert.alert('Erreur', 'Parametres manquants');
      return;
    }

    const numAmount = parseFloat(amount);

    try {
      setIsSubmitting(true);

      if (type === 'buy') {
        await trpcClient.investment.buy.mutate({
          walletId,
          assetId,
          amount: numAmount,
          gameInstanceId,
        });
        Alert.alert(
          'Achat effectue',
          `Vous avez investi ${Math.round(numAmount)} EUR dans ${asset?.title}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        const result = await trpcClient.investment.sell.mutate({
          walletId,
          assetId,
          amount: numAmount,
          gameInstanceId,
        });
        Alert.alert(
          'Vente effectuee',
          `Vous avez recupere ${Math.round(result.amountReceived)} EUR (dont ${Math.round(result.interests)} EUR d'interets)`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (e: any) {
      console.error('Transaction error:', e);
      Alert.alert('Erreur', e.message || 'Erreur lors de la transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxAvailable = type === 'buy' ? walletBalance : currentHolding;
  const isBuy = type === 'buy';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (error || !asset) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.accent} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error || 'Asset non trouve'}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isBuy ? '#4CAF50' : '#FF9800' }]}>
          <Ionicons
            name={isBuy ? 'arrow-down-circle' : 'arrow-up-circle'}
            size={48}
            color="#FFFFFF"
          />
          <Text style={styles.headerTitle}>
            {isBuy ? 'Acheter' : 'Vendre'}
          </Text>
          <Text style={styles.headerSubtitle}>{asset.title}</Text>
          {asset.symbol && (
            <View style={styles.symbolBadge}>
              <Text style={styles.symbolText}>{asset.symbol}</Text>
            </View>
          )}
        </View>

        {/* Balance Info */}
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: theme.text, opacity: 0.7 }]}>
              {isBuy ? 'Solde disponible' : 'Quantite detenue'}
            </Text>
            <Text style={[styles.balanceValue, { color: theme.text }]}>
              {Math.round(maxAvailable)} EUR
            </Text>
          </View>
          {isBuy && asset.maxAmount && (
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: theme.text, opacity: 0.7 }]}>
                Plafond
              </Text>
              <Text style={[styles.balanceValue, { color: theme.text }]}>
                {Math.round(currentHolding)} / {Math.round(Number(asset.maxAmount))} EUR
              </Text>
            </View>
          )}
          {asset.rate && (
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: theme.text, opacity: 0.7 }]}>
                Taux annuel
              </Text>
              <Text style={[styles.balanceValue, { color: '#4CAF50' }]}>
                {asset.rate}%
              </Text>
            </View>
          )}
        </View>

        {/* Amount Input */}
        <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Montant</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.text + '50'}
            />
            <Text style={[styles.inputSuffix, { color: theme.text }]}>EUR</Text>
          </View>
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.quickAmountsContainer}>
          <Text style={[styles.quickAmountsLabel, { color: theme.text, opacity: 0.7 }]}>
            Montants rapides
          </Text>
          <View style={styles.quickAmountsGrid}>
            {quickAmounts.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickAmountButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  value > maxAvailable && styles.quickAmountDisabled,
                ]}
                onPress={() => handleQuickAmount(value)}
                disabled={value > maxAvailable}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    { color: value > maxAvailable ? theme.text + '50' : theme.text },
                  ]}
                >
                  {value} EUR
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.quickAmountButton,
                styles.maxButton,
                { backgroundColor: theme.accent },
              ]}
              onPress={handleMaxAmount}
            >
              <Text style={styles.maxButtonText}>MAX</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: isBuy ? '#4CAF50' : '#FF9800' },
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !amount}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={isBuy ? 'checkmark-circle' : 'cash'}
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.submitButtonText}>
                {isBuy ? 'Confirmer l\'achat' : 'Confirmer la vente'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  symbolBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  symbolText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    borderWidth: 0,
    padding: 0,
  },
  inputSuffix: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickAmountsContainer: {
    marginBottom: 16,
  },
  quickAmountsLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  quickAmountDisabled: {
    opacity: 0.5,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  maxButton: {
    borderWidth: 0,
  },
  maxButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomContainer: {
    padding: 16,
    paddingTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

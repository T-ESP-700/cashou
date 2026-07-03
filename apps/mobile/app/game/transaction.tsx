import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAlert } from '@/hooks/use-alert';
import { trpcClient } from '@/lib/trpc';
import { useHeader, useGameHeaderSubtitle } from '@/hooks/use-header';
import { useGameRealtime } from '@/hooks/use-game-realtime';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import { ActionPillButton } from '@/components/ui/ActionPillButton';
import { useOptionalLevel1Tour } from '@/contexts/level1-tour-context';
import {
  Level1TourStep,
  isLivretAAsset,
  isSavingsLivretOtherThanA,
  tourBubbleForStep,
} from '@/constants/level1-tour';
import { Level1TourCoachBubble } from '@/components/level1-tour-coach-bubble';

type TransactionType = 'buy' | 'sell';

interface AssetData {
  id: number;
  title: string | null;
  symbol: string | null;
  rate: number | null;
  maxAmount: number | null;
  minAmount: number | null;
  submarket?: { type: string } | null;
}

export default function TransactionScreen() {
  const { colors: theme, isDark } = useCashouTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { activeGameInstanceId, pendingEventCompletion, setAssetsScreenDepth, assetsScreenDepthRef, setIsOnAssetsScreen, setPausedByAssets, setRequestedAssetsSheetGameId } = useNotifications();
  const { user } = useAuth();
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

  // Track depth for nested navigation (assets -> asset-detail -> transaction)
  useFocusEffect(
    useCallback(() => {
      console.log('[TransactionScreen] ENTER - currentDepth:', assetsScreenDepthRef.current);

      // Increment depth when entering transaction (the ref is updated by setAssetsScreenDepth in the context)
      setAssetsScreenDepth((prev: number) => prev + 1);

      return () => {
        // Get current values from refs to avoid stale closures
        const gameId = activeGameInstanceIdRef.current;
        const currentUser = userRef.current;
        const pendingCompletion = pendingEventCompletionRef.current;

        console.log('[TransactionScreen] EXIT - gameId:', gameId, 'user:', currentUser?.id, 'currentDepth:', assetsScreenDepthRef.current);

        // Decrement depth when leaving transaction (the ref is updated by setAssetsScreenDepth in the context)
        const newDepth = Math.max(0, assetsScreenDepthRef.current - 1);
        setAssetsScreenDepth(newDepth);

        console.log('[TransactionScreen] EXIT - newDepth:', newDepth);

        // If we're leaving all assets screens (depth = 0), wait a bit then check if we should resume
        // The delay allows asset-detail or assets.tsx to increment depth if we're navigating back there
        if (newDepth === 0 && gameId && currentUser) {
          console.log('[TransactionScreen] EXIT - Depth is 0, scheduling resume check in 150ms');

          setTimeout(async () => {
            console.log('[TransactionScreen] EXIT - Resume check executing, current depth:', assetsScreenDepthRef.current);

            // Check if depth is still 0 after the delay (no other assets screen took focus)
            if (assetsScreenDepthRef.current > 0) {
              console.log('[TransactionScreen] ⏸️  Another assets screen took focus (depth=' + assetsScreenDepthRef.current + '), not resuming');
              return;
            }

            console.log('[TransactionScreen] EXIT - No other assets screen, proceeding with resume');

            try {
              // Check current game state before resuming
              console.log('[TransactionScreen] EXIT - Fetching game state...');
              const gameInstance = await trpcClient.gameInstance.getById.query({ id: gameId });
              const isCurrentlyPaused = gameInstance?.isPaused ?? false;

              console.log('[TransactionScreen] EXIT - Game state: isPaused=', isCurrentlyPaused);

              const isWaitingForEventResume = pendingCompletion === gameId;

              // Resume only when we're not intentionally paused after an event.
              if (isCurrentlyPaused && !isWaitingForEventResume) {
                console.log('[TransactionScreen] 🎮 Resuming game', gameId);
                await trpcClient.gameInstance.resume.mutate({ id: gameId });
                console.log('[TransactionScreen] ✅ Game resumed successfully');
              } else {
                console.log('[TransactionScreen] ⏸️  Game stays paused after transaction exit');
              }

              setPausedByAssets(false);
              setIsOnAssetsScreen(false);
            } catch (error) {
              console.error('[TransactionScreen] ❌ Failed to resume game:', error);
              setPausedByAssets(false);
              setIsOnAssetsScreen(false);
            }
          }, 150); // Wait 150ms to see if another assets screen takes focus
        } else {
          console.log('[TransactionScreen] EXIT - Not leaving all assets (newDepth=' + newDepth + ' or no game/user)');
          setIsOnAssetsScreen(newDepth > 0);
        }
      };
    }, [setAssetsScreenDepth, setIsOnAssetsScreen, setPausedByAssets, assetsScreenDepthRef])
  );

  // Params
  const assetId = params.assetId ? parseInt(params.assetId as string, 10) : null;
  const type = (params.type as TransactionType) || 'buy';
  const gameInstanceId = params.gameInstanceId ? parseInt(params.gameInstanceId as string, 10) : null;
  const walletId = params.walletId ? parseInt(params.walletId as string, 10) : null;

  // State
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [currentHolding, setCurrentHolding] = useState(0); // raw quantity (invested amount)
  const [currentHoldingValue, setCurrentHoldingValue] = useState(0); // total value (invested + interests)
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
        if (type === 'sell' && gameInstanceId) {
          try {
            const portfolio = await trpcClient.investment.getPortfolio.query({
              walletId,
              gameInstanceId,
            });
            const aid = assetId;
            const item = portfolio.items.find((i: any) => i.holding.assetId === aid);
            if (item) {
              setCurrentHolding(Math.round(item.currentValue)); // raw quantity (for backend)
              setCurrentHoldingValue(Math.round(item.totalValue)); // with interests (for display)
            }
          } catch (e) {
            console.error('Error fetching portfolio for sell:', e);
            // Fallback to raw holding quantity
            try {
              const holdings = await trpcClient.holding.getByWallet.query({ walletId });
              const holding = holdings.find((h: any) => h.assetId === assetId);
              if (holding) {
                const qty = Number(holding.quantity) || 0;
                setCurrentHolding(qty);
                setCurrentHoldingValue(qty);
              }
            } catch {}
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

  const tourDepositHere =
    Boolean(
      level1Tour?.sessionActive &&
        level1Tour.step === Level1TourStep.DepositOnLivretA &&
        type === 'buy' &&
        asset &&
        isLivretAAsset(asset),
    );

  // Étape de retrait du tuto : même parcours guidé (voile + spotlights + confirmer mis
  // en lumière) que le dépôt, mais en mode vente sur le Livret A.
  const tourWithdrawHere =
    Boolean(
      level1Tour?.sessionActive &&
        level1Tour.step === Level1TourStep.SelectLivretAForWithdraw &&
        type === 'sell' &&
        asset &&
        isLivretAAsset(asset),
    );

  // Seconde partie des actions du premier événement : replacer sur un AUTRE livret (DDS) le
  // cash retiré du Livret A. Même parcours guidé (voile + spotlights + confirmer en lumière)
  // que le dépôt initial, mais en mode achat sur le livret alternatif.
  const tourMoveToOtherLivretHere =
    Boolean(
      level1Tour?.sessionActive &&
        level1Tour.step === Level1TourStep.WithdrawAndMoveToOtherLivret &&
        type === 'buy' &&
        asset &&
        isSavingsLivretOtherThanA(asset),
    );

  // Un seul des trois est vrai à la fois : pilote tout le parcours guidé de cet écran.
  const tourGuidedHere = tourDepositHere || tourWithdrawHere || tourMoveToOtherLivretHere;

  const tourLivretPrefillAppliedRef = useRef(false);

  useEffect(() => {
    if (!tourGuidedHere) {
      tourLivretPrefillAppliedRef.current = false;
      return;
    }
    if (tourLivretPrefillAppliedRef.current || amount !== '') return;
    if (!asset) return;
    if (tourWithdrawHere) {
      // Retrait guidé : on propose de retirer la totalité du Livret A pour libérer le cash.
      const full = Math.floor(currentHoldingValue);
      if (full > 0) {
        tourLivretPrefillAppliedRef.current = true;
        setAmount(String(full));
      }
      return;
    }
    if (tourMoveToOtherLivretHere) {
      // Déplacement post-event : on propose de replacer TOUT le cash disponible (issu du
      // retrait du Livret A) sur l'autre livret, dans la limite du plafond.
      const min = asset.minAmount != null ? Number(asset.minAmount) : 1;
      const maxFromCap =
        asset.maxAmount != null
          ? Math.max(0, Number(asset.maxAmount) - currentHolding)
          : walletBalance;
      const cap = Math.min(walletBalance, maxFromCap);
      if (cap >= min) {
        tourLivretPrefillAppliedRef.current = true;
        setAmount(String(Math.floor(cap)));
      }
      return;
    }
    const min = asset.minAmount != null ? Number(asset.minAmount) : 1;
    const maxFromCap =
      asset.maxAmount != null
        ? Math.max(0, Number(asset.maxAmount) - currentHolding)
        : walletBalance;
    const cap = Math.min(walletBalance, maxFromCap);
    if (cap <= 0) return;
    const target = Math.max(min, Math.min(200, Math.floor(cap)));
    const suggested = Math.min(cap, target);
    if (suggested >= min) {
      tourLivretPrefillAppliedRef.current = true;
      setAmount(String(Math.floor(suggested)));
    }
  }, [tourGuidedHere, tourWithdrawHere, tourMoveToOtherLivretHere, amount, asset, walletBalance, currentHolding, currentHoldingValue]);

  // Tuto étape 2 : auto-scroll pour cadrer la carte Montant, voile + spotlight sur le champ
  const scrollRef = useRef<ScrollView>(null);
  const [montantCardY, setMontantCardY] = useState(0);
  const tourScrolledRef = useRef(false);

  // Sous-parcours guidé (dépôt ou retrait) en DEUX temps :
  //   'amount'  → champ Montant mis en lumière + bouton flottant « Suivant »
  //   'confirm' → montants rapides ET « Confirmer le dépôt » mis en lumière (plus de « Suivant »)
  //               pour forcer la validation directe de la somme pré-remplie (200 €).
  const [tourDepositSubStep, setTourDepositSubStep] = useState<'amount' | 'confirm'>('amount');
  useEffect(() => {
    if (tourGuidedHere) setTourDepositSubStep('amount');
  }, [tourGuidedHere]);
  const tourVeilActive = tourGuidedHere; // voile présent durant tout le sous-parcours
  const spotAmount = tourGuidedHere && tourDepositSubStep === 'amount';
  // En phase 'confirm' on éclaire le bouton de confirmation (action finale forcée). Les montants
  // rapides ne sont mis en avant QUE pour le retrait / le déplacement, où le montant reste
  // modifiable. Pour le PREMIER DÉPÔT la valeur est verrouillée à 200 € (voir plus bas) : on ne
  // met donc pas ses montants rapides en avant (ils sont désactivés).
  const spotQuick = (tourWithdrawHere || tourMoveToOtherLivretHere) && tourDepositSubStep === 'confirm';
  const spotConfirm = tourGuidedHere && tourDepositSubStep === 'confirm';
  const handleTourNext = () => setTourDepositSubStep('confirm');

  // Highlight "propre" (bordure blanche + ombre) appliqué au bouton confirmer en phase
  // 'confirm' — identique au bouton « Commencer » et aux boutons Déposer/Retirer.
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

  // Textes des bulles, adaptés au dépôt ou au retrait.
  const spotAmountMessage = tourWithdrawHere
    ? "Retires l'argent placé sur ton Livret A"
    : tourMoveToOtherLivretHere
      ? "Place ici l'argent retiré de ton Livret A"
      : "On place 200 € sur ton Livret A pour ce premier dépôt. C'est ici, dans une vraie partie, que tu pourras saisir librement le montant de ton choix.";
  const spotQuickMessage = tourWithdrawHere
    ? 'Ou choisis le montant à retirer'
    : tourMoveToOtherLivretHere
      ? 'Ou choisis en un clic le montant à déplacer'
      : 'Ou choisis en un clic le montant à placer';

  // Cadrer la carte Montant (+ montants rapides) une fois mesurée, à l'entrée de l'étape
  useEffect(() => {
    if (!tourGuidedHere) {
      tourScrolledRef.current = false;
      return;
    }
    if (tourScrolledRef.current || montantCardY <= 0) return;
    tourScrolledRef.current = true;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, montantCardY - 24), animated: true });
    }, 350);
    return () => clearTimeout(t);
  }, [tourGuidedHere, montantCardY]);

  // Assombrir aussi le header pendant l'étape (le voile de l'écran ne le couvre pas).
  // Pas de reset au démontage : il s'exécuterait de façon non déterministe par rapport à la
  // ré-affirmation au focus de l'écran de jeu (course → header resté clair à l'étape suivante).
  useEffect(() => {
    setHeaderOptions({ dimmed: tourVeilActive });
  }, [tourVeilActive, setHeaderOptions]);

  // Reset du voile header au BLUR (et non au démontage) : expo-router garantit l'ordre
  // blur(écran sortant) → focus(écran entrant), donc l'écran qui prend le focus impose
  // ensuite sa propre valeur de `dimmed` sans course.
  useFocusEffect(
    useCallback(() => {
      return () => setHeaderOptions({ dimmed: false });
    }, [setHeaderOptions])
  );

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  // Convert a user-entered value amount to raw quantity for the backend
  const valueToRawQuantity = (valueAmount: number): number => {
    if (currentHoldingValue <= 0 || currentHolding <= 0) return valueAmount;
    // Proportional: if user wants to sell X out of totalValue, send (X / totalValue) * rawQuantity
    const ratio = valueAmount / currentHoldingValue;
    return Math.min(Math.floor(ratio * currentHolding), currentHolding);
  };

  const handleMaxAmount = () => {
    if (type === 'buy') {
      let maxBuy = walletBalance;
      if (asset?.maxAmount) {
        const remaining = Number(asset.maxAmount) - currentHolding;
        maxBuy = Math.min(walletBalance, remaining);
      }
      setAmount(Math.floor(maxBuy).toString());
    } else {
      // For sell: show total value (invested + interests)
      setAmount(Math.floor(currentHoldingValue).toString());
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
      if (numAmount > currentHoldingValue) {
        return `Montant insuffisant. Disponible: ${Math.round(currentHoldingValue)} EUR`;
      }
    }

    return null;
  };

  const goBackToCurrentWithSheet = () => {
    // Pendant le tuto, un DÉPÔT (buy) clôt une étape guidée et doit ramener au jeu pour l'étape
    // suivante, SANS rouvrir la feuille des actifs :
    //   - dépôt Livret A → étape « ferme la feuille et appuie sur Commencer »
    //   - dépôt DDS (post-événement) → étape « Reprendre »
    // Rouvrir la feuille ici recréait un état confus (feuille rouverte alors que le tuto demande
    // de fermer) et cassait la navigation au reclic. Les RETRAITS (sell), eux, rouvrent la feuille
    // pour que le joueur puisse ensuite choisir le DDS.
    // On teste l'action (buy sur un livret), pas le step du tour qui a pu déjà avancer.
    const completedTutorialMove = Boolean(
      level1Tour?.sessionActive &&
        type === 'buy' &&
        asset &&
        (isLivretAAsset(asset) || isSavingsLivretOtherThanA(asset)),
    );
    const shouldReopenAssetsSheet = !completedTutorialMove;

    // Re-open the assets sheet when the user may need to keep browsing assets,
    // but return directly to the game once the tutorial move is completed.
    if (shouldReopenAssetsSheet && gameInstanceId) {
      setRequestedAssetsSheetGameId(gameInstanceId);
    }
    // Pop back to /game/current: go back twice (transaction → asset-detail → current)
    router.back();
    setTimeout(() => router.back(), 50);
  };

  const handleSubmit = async () => {
    const validationError = validateAmount();
    if (validationError) {
      showAlert('Erreur', validationError);
      return;
    }

    if (!assetId || !walletId || !gameInstanceId) {
      showAlert('Erreur', 'Parametres manquants');
      return;
    }

    const tr = level1Tour;
    if (tr?.sessionActive && asset) {
      if (tr.step === Level1TourStep.DepositOnLivretA) {
        if (type !== 'buy' || !isLivretAAsset(asset)) {
          showAlert('Tutoriel', tourBubbleForStep(tr.step, tr.eventPhase));
          return;
        }
      }
      if (tr.step === Level1TourStep.SelectLivretAForWithdraw) {
        if (type !== 'sell' || !isLivretAAsset(asset)) {
          showAlert('Tutoriel', tourBubbleForStep(tr.step, tr.eventPhase));
          return;
        }
      }
      if (tr.step === Level1TourStep.WithdrawAndMoveToOtherLivret) {
        if (type !== 'buy' || !isSavingsLivretOtherThanA(asset)) {
          showAlert('Tutoriel', tourBubbleForStep(tr.step, tr.eventPhase));
          return;
        }
      }
    }

    const numAmount = parseFloat(amount);

    try {
      setIsSubmitting(true);

      let alertTitle: string;
      let alertMessage: string;

      if (type === 'buy') {
        await trpcClient.investment.buy.mutate({
          walletId,
          assetId,
          amount: numAmount,
          gameInstanceId,
        });
        if (
          tr?.sessionActive &&
          tr.step === Level1TourStep.WithdrawAndMoveToOtherLivret &&
          asset &&
          isSavingsLivretOtherThanA(asset)
        ) {
          await tr.goToStep(Level1TourStep.PostEventResume);
        }
        alertTitle = 'Achat effectué';
        alertMessage = `Vous avez investi ${Math.round(numAmount)} EUR dans ${asset?.title}`;
      } else {
        // Convert user-entered value to raw quantity for backend
        const rawAmount = valueToRawQuantity(numAmount);
        const result = await trpcClient.investment.sell.mutate({
          walletId,
          assetId,
          amount: rawAmount,
          gameInstanceId,
        });
        alertTitle = 'Vente effectuée';
        alertMessage = `Vous avez récupéré ${Math.round(result.amountReceived)} EUR (dont ${Math.round(result.interests)} EUR d'intérêts)`;
      }

      // Navigate first, then show alert on the destination screen
      goBackToCurrentWithSheet();
      setTimeout(() => {
        showAlert(alertTitle, alertMessage);
      }, 300);
    } catch (e: any) {
      console.error('Transaction error:', e);
      showAlert('Erreur', e.message || 'Erreur lors de la transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxAvailable = type === 'buy' ? walletBalance : currentHoldingValue;
  const displayValue = maxAvailable;
  const isBuy = type === 'buy';
  const isSavings = asset?.submarket?.type === 'SAVINGS';

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
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
          // Pendant le tuto : le contenu remplit AU MOINS tout le viewport pour que le voile
          // (absoluteFill dans le contenu) recouvre l'écran entier. Sans ça, quand le contenu
          // est plus court que l'écran, une bande claire restait visible sous le contenu.
          tourVeilActive && { flexGrow: 1 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, shadowColor: theme.border }]}>
          <Ionicons
            name={isSavings ? (isBuy ? 'download-outline' : 'arrow-up-circle') : (isBuy ? 'arrow-down-circle' : 'arrow-up-circle')}
            size={48}
            color={theme.accent}
          />
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
            {isSavings ? (isBuy ? 'Déposer' : 'Retirer') : (isBuy ? 'Acheter' : 'Vendre')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>{asset.title}</Text>
          {asset.symbol && (
            <View style={[styles.symbolBadge, { backgroundColor: `${theme.accent}20` }]}>
              <Text style={[styles.symbolText, { color: theme.accent }]}>{asset.symbol}</Text>
            </View>
          )}
        </View>

        {/* Balance Info */}
        <View style={[styles.balanceCard, { backgroundColor: theme.card }]}>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: theme.text, opacity: 0.7 }]}>
              {isBuy ? 'Solde disponible' : (isSavings ? 'Valeur actuelle' : 'Valeur actuelle')}
            </Text>
            <Text style={[styles.balanceValue, { color: theme.text }]}>
              {Math.round(displayValue)} EUR
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

        {/* Amount Input — mis en lumière (au-dessus du voile) pendant l'étape versement */}
        <View
          onLayout={(e) => setMontantCardY(e.nativeEvent.layout.y)}
          style={[
            styles.inputCard,
            { backgroundColor: theme.card },
            spotAmount && { zIndex: 20, elevation: 20 },
          ]}
        >
          <Text style={[styles.inputLabel, { color: theme.text }]}>Montant</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.text + '50'}
              // Premier dépôt guidé : valeur verrouillée à 200 € (non éditable).
              editable={!tourDepositHere}
            />
            <Text style={[styles.inputSuffix, { color: theme.text }]}>EUR</Text>
          </View>
        </View>

        {/* Bulle du tuto, sous le champ Montant (phase 1) */}
        {spotAmount && (
          <View style={{ zIndex: 20, elevation: 20 }}>
            <Level1TourCoachBubble tail="up" message={spotAmountMessage} />
          </View>
        )}

        {/* Quick Amount Buttons — mis en lumière en phase 2 du tuto */}
        <View style={[styles.quickAmountsContainer, spotQuick && { zIndex: 20, elevation: 20 }]}>
          <Text style={[styles.quickAmountsLabel, { color: theme.text, opacity: 0.7 }]}>
            Montants rapides
          </Text>
          <View style={styles.quickAmountsGrid}>
            {quickAmounts.map((value) => {
              // Premier dépôt guidé : montant verrouillé à 200 € → montants rapides désactivés.
              const disabled = value > maxAvailable || tourDepositHere;
              return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickAmountButton,
                  { backgroundColor: theme.card },
                  disabled && styles.quickAmountDisabled,
                ]}
                onPress={() => handleQuickAmount(value)}
                disabled={disabled}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    { color: disabled ? theme.text + '50' : theme.text },
                  ]}
                >
                  {value} EUR
                </Text>
              </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[
                styles.quickAmountButton,
                styles.maxButton,
                { backgroundColor: theme.accent },
                tourDepositHere && styles.quickAmountDisabled,
              ]}
              onPress={handleMaxAmount}
              disabled={tourDepositHere}
            >
              <Text style={styles.maxButtonText}>MAX</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bulle du tuto, sous les montants rapides (phase 2) */}
        {spotQuick && (
          <View style={{ zIndex: 20, elevation: 20 }}>
            <Level1TourCoachBubble tail="up" message={spotQuickMessage} />
          </View>
        )}

        {/* Voile du tuto : assombrit tout le contenu sauf l'élément mis en lumière (zIndex 20) */}
        {tourVeilActive && (
          <View
            pointerEvents="none"
            style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,30,51,0.55)', zIndex: 10 }}
          />
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        {/* Seul le bouton est surélevé au-dessus du voile (zIndex 20) → seul lui est mis en
            lumière en phase 'confirm', pas toute la barre du bas. */}
        <View style={spotConfirm ? { zIndex: 20, elevation: 20 } : undefined}>
          <ActionPillButton
            label={isSavings ? (isBuy ? 'Confirmer le dépôt' : 'Confirmer le retrait') : (isBuy ? "Confirmer l'achat" : 'Confirmer la vente')}
            iconName={isBuy ? 'checkmark-circle' : 'cash'}
            onPress={handleSubmit}
            disabled={isSubmitting || !amount}
            isLoading={isSubmitting}
            style={spotConfirm ? tourFocusedPillStyle : undefined}
          />
        </View>
        {/* Voile sombre sur toute la barre pendant le tuto (y compris en phase 'confirm') :
            il assombrit le pourtour, et le bouton (zIndex 20) ressort seul au-dessus. */}
        {tourVeilActive && (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(28,30,51,0.55)', zIndex: 10 }]}
          />
        )}
      </View>

      {/* Bouton flottant "Suivant" : visible tant qu'on n'est pas sur la phase Confirmer.
          Utilise le composant ActionPillButton (texte bleu foncé sur fond accent) pour rester
          cohérent avec tous les autres boutons de l'app. */}
      {tourVeilActive && !spotConfirm && (
        <View
          style={{
            position: 'absolute',
            right: 20,
            bottom: insets.bottom + 92,
            zIndex: 40,
            elevation: 40,
          }}
        >
          <ActionPillButton
            label="Suivant"
            iconName="chevron-forward"
            onPress={handleTourNext}
          />
        </View>
      )}
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
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 18,
    opacity: 0.9,
    marginTop: 4,
  },
  symbolBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  symbolText: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 8,
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
    borderRadius: 22,
    padding: 16,
    marginBottom: 8,
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
    borderRadius: 22,
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

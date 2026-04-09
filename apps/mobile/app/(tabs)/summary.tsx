import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAlert } from '@/hooks/use-alert';
import { trpcClient } from '@/lib/trpc';
import { useHeaderOptions } from '@/hooks/use-header';
import { useAuth } from '@/hooks/use-auth';
import { ActionPillButton, GoalStarIcon } from '@/components/ui';
import QuizActionIcon from '@/assets/images/quiz-action.svg';
import TxIconBuy from '@/assets/images/tx-icon-buy.svg';
import TxIconSell from '@/assets/images/tx-icon-sell.svg';
import TxIconArrow from '@/assets/images/tx-icon-arrow.svg';

interface GoalResult {
  id: number;
  title: string;
  description: string | null;
  isMandatory?: boolean;
  validated: boolean;
}

interface EndGameResult {
  success: boolean;
  gameInstanceId: number;
  startBalance: number;
  walletBalance: number;
  assetsValue: number;
  totalValue: number;
  goals: GoalResult[];
  message: string;
  stars?: number;
  mandatoryGoalsMet?: boolean;
  bonusGoalsMet?: boolean;
  quizPassed?: boolean;
}

interface GameInstanceData {
  id: number;
  level: {
    id: number;
    title: string | null;
    number: number | null;
    startBalance: number | null;
    description: string | null;
  } | null;
}

interface UserLevelEntry {
  unlocked: boolean;
  level: {
    id: number;
    number: number | null;
    title: string | null;
  };
}

interface TransactionItem {
  id: number;
  type: string;
  assetTitle: string;
  totalValue: number;
}

interface TransactionGroup {
  submarketTitle: string;
  items: TransactionItem[];
}

function groupTransactionsBySubmarket(txs: any[]): TransactionGroup[] {
  const groups = new Map<string, TransactionItem[]>();
  for (const tx of txs) {
    const key = tx.asset?.submarket?.title ?? 'Autre';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({
      id: tx.id,
      type: tx.type ?? 'BUY',
      assetTitle: tx.asset?.title ?? 'Actif inconnu',
      totalValue: tx.totalValue ? Number(tx.totalValue) : 0,
    });
  }
  return Array.from(groups.entries()).map(([submarketTitle, items]) => ({ submarketTitle, items }));
}

export default function GameSummaryScreen() {
  const params = useLocalSearchParams<{ gameId?: string; levelId?: string; mode?: string }>();
  const { gameId, levelId, mode } = params;
  const isHistoryMode = mode === 'history';
  const { user } = useAuth();
  const { colors: theme, isDark } = useCashouTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  useHeaderOptions({ showBackButton: true, title: 'Résumé' });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endGameResult, setEndGameResult] = useState<EndGameResult | null>(null);
  const [gameInstance, setGameInstance] = useState<GameInstanceData | null>(null);
  const [levelQuizId, setLevelQuizId] = useState<number | null>(null);
  // statut du quiz pour CETTE partie spécifique (source de vérité) — mode normal uniquement
  const [quizStatusForGame, setQuizStatusForGame] = useState<'notDone' | 'doneAndPassed' | 'doneAndFailed'>('notDone');
  const [nextLevel, setNextLevel] = useState<UserLevelEntry['level'] | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isDetailedView, setIsDetailedView] = useState(false);
  const [transactionGroups, setTransactionGroups] = useState<TransactionGroup[] | null>(null);
  const transactionsFetched = useRef(false);

  // --- Chargement mode normal (depuis fin de partie ou quiz) ---
  useEffect(() => {
    if (isHistoryMode) return;
    const fetchData = async () => {
      if (!gameId) {
        setError('ID de la partie manquant');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const gameInstanceId = parseInt(gameId, 10);
        const instance = await trpcClient.gameInstance.getById.query({ id: gameInstanceId });
        if (instance) {
          const typedInstance = instance as GameInstanceData;
          setGameInstance(typedInstance);

          if (typedInstance.level?.id) {
            try {
              const quizzes = await trpcClient.quiz.getByLevel.query({ levelId: typedInstance.level.id });
              setLevelQuizId(quizzes?.[0]?.id ?? null);
            } catch (quizErr) {
              console.error('Error fetching level quiz:', quizErr);
            }

            try {
              const quizStatus = await trpcClient.userQuiz.getQuizStatusForGame.query({
                gameInstanceId: gameInstanceId,
              });
              setQuizStatusForGame(quizStatus.status);
            } catch {
              setQuizStatusForGame('notDone');
            }
          }
        }

        const result = await trpcClient.gameInstance.endGame.mutate({ id: gameInstanceId });
        setEndGameResult(result as EndGameResult);
      } catch (err) {
        console.error('Error fetching game summary:', err);
        setError('Erreur lors du chargement des resultats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId, isHistoryMode]);

  // --- Chargement mode history (depuis game-history) ---
  useEffect(() => {
    if (!isHistoryMode) return;
    const fetchHistoryData = async () => {
      if (!levelId || !user?.id) {
        setError('Données manquantes');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const parsedLevelId = parseInt(levelId, 10);

        // Trouver la meilleure gameInstance pour ce niveau
        const bestInstance = await trpcClient.gameInstance.getBestForLevel.query({
          levelId: parsedLevelId,
          userId: user.id,
        });

        if (!bestInstance) {
          setError('Aucune partie terminée pour ce niveau');
          setIsLoading(false);
          return;
        }

        const typedInstance = bestInstance as GameInstanceData;
        setGameInstance(typedInstance);

        // Charger le quiz du niveau pour l'afficher si quizPassed
        if ((typedInstance as any).level?.id) {
          try {
            const quizzes = await trpcClient.quiz.getByLevel.query({ levelId: (typedInstance as any).level.id });
            setLevelQuizId(quizzes?.[0]?.id ?? null);
          } catch {}
        }

        // Récupérer le résultat en lecture seule
        // getEndGameResult inclut mandatoryGoalsMet/bonusGoalsMet/quizPassed depuis UserLevelCompletion
        const result = await trpcClient.gameInstance.getEndGameResult.query({ id: (bestInstance as any).id });
        setEndGameResult(result as EndGameResult);
      } catch (err) {
        console.error('Error fetching history summary:', err);
        setError('Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryData();
  }, [levelId, user?.id, isHistoryMode]);

  // --- Niveau suivant (mode normal uniquement) ---
  useEffect(() => {
    if (isHistoryMode) return;
    const fetchNextLevel = async () => {
      if (!user?.id || !gameInstance?.level?.id) return;

      try {
        const levels = await trpcClient.level.getUserLevels.query({ userId: user.id }) as UserLevelEntry[];
        const currentNumber = gameInstance.level.number ?? null;
        const currentLevelId = gameInstance.level.id;

        if (currentNumber != null) {
          const candidate = levels
            .filter((entry) => entry.unlocked && (entry.level.number ?? 0) > currentNumber)
            .sort((a, b) => (a.level.number ?? 0) - (b.level.number ?? 0))[0];
          setNextLevel(candidate?.level ?? null);
          return;
        }

        const candidateById = levels
          .filter((entry) => entry.unlocked && entry.level.id > currentLevelId)
          .sort((a, b) => a.level.id - b.level.id)[0];
        setNextLevel(candidateById?.level ?? null);
      } catch (err) {
        console.error('Error fetching user levels for next level CTA:', err);
      }
    };

    fetchNextLevel();
  }, [gameInstance?.level?.id, gameInstance?.level?.number, user?.id, isHistoryMode]);

  // --- Transactions (mode normal uniquement) ---
  useEffect(() => {
    if (isHistoryMode || !isDetailedView || transactionsFetched.current || !gameId) return;
    const gameInstanceId = parseInt(gameId, 10);
    transactionsFetched.current = true;
    trpcClient.transaction.getByGameInstance.query({ gameInstanceId })
      .then((txs: any[]) => setTransactionGroups(groupTransactionsBySubmarket(txs)))
      .catch((err: any) => {
        console.error('Error fetching transactions:', err);
        setTransactionGroups([]);
      });
  }, [isDetailedView, gameId, isHistoryMode]);

  // --- Rafraîchir le statut du quiz au retour de l'écran quiz (mode normal uniquement) ---
  useFocusEffect(
    useCallback(() => {
      if (isHistoryMode || !gameInstance?.id) return;
      let cancelled = false;

      trpcClient.userQuiz.getQuizStatusForGame.query({ gameInstanceId: gameInstance.id })
        .then((result: any) => {
          if (cancelled) return;
          setQuizStatusForGame(result.status);
        })
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    }, [gameInstance?.id, isHistoryMode])
  );

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const handleGoToQuiz = () => {
    if (!levelQuizId) return;
    router.push({
      pathname: '/(tabs)/daily-quiz',
      params: {
        quizId: levelQuizId.toString(),
        gameInstanceId: gameInstance?.id ? gameInstance.id.toString() : '',
      },
    });
  };

  const handleGoToNextLevel = () => {
    if (!nextLevel?.id) return;
    router.replace({
      pathname: '/game/current',
      params: { levelId: String(nextLevel.id) },
    });
  };

  const handleReplay = async () => {
    if (!user?.id || !gameInstance?.level?.id) return;

    const activeGame = await trpcClient.gameInstance.getActiveByUser.query({ userId: user.id });
    if (activeGame) {
      const confirmed = await new Promise<boolean>((resolve) => {
        showAlert(
          'Partie en cours',
          'Lancer cette partie va clôturer la partie en cours sans gagner de récompenses. Voulez-vous continuer ?',
          [
            { text: 'Annuler', style: 'cancel' as const, onPress: () => resolve(false) },
            { text: 'Continuer', onPress: () => resolve(true) },
          ]
        );
      });
      if (!confirmed) return;
      await trpcClient.gameInstance.abandon.mutate({ id: activeGame.id });
    }

    setIsReplaying(true);
    try {
      const levelId = gameInstance.level.id;
      const startBalance = gameInstance.level.startBalance ?? 1000;
      const newGame = await trpcClient.gameInstance.create.mutate({
        userId: user.id,
        levelId,
        startBalance,
        isPaused: true,
      });

      await trpcClient.wallet.create.mutate({
        userId: user.id,
        gameInstanceId: newGame.id,
        amount: startBalance,
      });

      router.replace({
        pathname: '/game/current',
        params: { gameId: String(newGame.id), levelId: String(levelId) },
      });
    } catch (err) {
      console.error('Error creating replay game:', err);
      showAlert('Erreur', 'Impossible de créer la partie');
    } finally {
      setIsReplaying(false);
    }
  };

  const formatAmount = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} EUR`;

  const profit = endGameResult ? endGameResult.totalValue - endGameResult.startBalance : 0;
  const profitPercent = endGameResult
    ? ((profit / endGameResult.startBalance) * 100)
    : 0;
  const profitText = `${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(1)}%`;
  const profitChipColor = profit >= 0 ? '#0C9A20' : '#D54747';

  const primaryGoal = endGameResult?.goals.find((g) => g.isMandatory) ?? endGameResult?.goals[0] ?? null;
  const bonusGoal = endGameResult?.goals.find((g) => g.isMandatory === false) ?? endGameResult?.goals[1] ?? null;

  const hasLevelQuiz = levelQuizId != null;
  const isQuizDoneForThisGame = quizStatusForGame !== 'notDone';
  const isQuizPassedForThisGame = quizStatusForGame === 'doneAndPassed';
  const shouldShowQuizCta = !isHistoryMode && endGameResult?.success === true && hasLevelQuiz && !isQuizDoneForThisGame;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Chargement du recapitulatif...</Text>
        </View>
      </View>
    );
  }

  if (error || !endGameResult) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.accent} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error || 'Erreur lors du chargement'}</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleGoHome}
          >
            <Text style={[styles.backButtonText, { color: theme.text }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 112 }]}
      >
        <Text allowFontScaling={false} style={[styles.screenTitle, { color: theme.text }]}>Récapitulatif</Text>
        <View style={[styles.titleUnderline, { backgroundColor: theme.text }]} />

        {isHistoryMode ? (
          // Mode history : contexte du niveau (titre + description)
          <>
            <Text allowFontScaling={false} style={[styles.sectionTitle, { color: theme.text }]}>
              Niveau {gameInstance?.level?.number ?? ''}
            </Text>
            <View style={[styles.panel, { backgroundColor: theme.card }]}>
              {gameInstance?.level?.title ? (
                <Text allowFontScaling={false} style={[styles.levelContextTitle, { color: theme.text }]}>
                  {gameInstance.level.title}
                </Text>
              ) : null}
              {gameInstance?.level?.description ? (
                <Text allowFontScaling={false} style={[styles.levelContextDescription, { color: theme.text }]}>
                  {gameInstance.level.description}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          // Mode normal : bilan financier avec switch vue simple/détaillée
          <>
            <View style={styles.sectionHeaderRow}>
              <Text allowFontScaling={false} style={[styles.sectionTitle, { color: theme.text }]}>
                {isDetailedView ? 'Transactions' : 'Bilan'}
              </Text>
              <View style={styles.simpleViewRow}>
                <Text allowFontScaling={false} style={[styles.simpleViewText, { color: theme.text }]}>
                  {isDetailedView ? 'Vue détaillée' : 'Vue simple'}
                </Text>
                <Switch
                  value={isDetailedView}
                  onValueChange={setIsDetailedView}
                  trackColor={{ false: theme.borderLight, true: '#4CAF50' }}
                  thumbColor={theme.card}
                />
              </View>
            </View>

            {isDetailedView ? (
              transactionGroups === null ? (
                <View style={[styles.panel, { backgroundColor: theme.card }]}>
                  <ActivityIndicator size="small" color={theme.text} />
                </View>
              ) : transactionGroups.length === 0 ? (
                <View style={[styles.panel, { backgroundColor: theme.card }]}>
                  <Text allowFontScaling={false} style={[styles.summaryLabel, { color: theme.text }]}>Aucune transaction</Text>
                </View>
              ) : (
                transactionGroups.map((group) => (
                  <View key={group.submarketTitle}>
                    <Text allowFontScaling={false} style={[styles.transactionGroupTitle, { color: theme.text }]}>{group.submarketTitle}</Text>
                    <View style={[styles.transactionGroupCard, { backgroundColor: theme.card }]}>
                      {group.items.map((item) => {
                        const isSell = item.type === 'SELL';
                        const isInterest = item.type === 'INTEREST';
                        const TypeIcon = isSell ? TxIconSell : TxIconBuy;
                        return (
                          <View key={item.id} style={styles.transactionRow}>
                            <TypeIcon width={12} height={12} />
                            {isInterest ? (
                              <Text allowFontScaling={false} style={[styles.transactionLabelFlex, { color: theme.text }]} numberOfLines={1}>
                                Intérêts {item.assetTitle}
                              </Text>
                            ) : (
                              <View style={styles.transactionLabelRow}>
                                <Text allowFontScaling={false} style={[styles.transactionLabel, { color: theme.text }]} numberOfLines={1}>
                                  {isSell ? item.assetTitle : 'Portefeuille'}
                                </Text>
                                <TxIconArrow width={12} height={12} />
                                <Text allowFontScaling={false} style={[styles.transactionLabel, { color: theme.text }]} numberOfLines={1}>
                                  {isSell ? 'Portefeuille' : item.assetTitle}
                                </Text>
                              </View>
                            )}
                            <Text allowFontScaling={false} style={[styles.transactionAmount, { color: theme.text }]}>{formatAmount(item.totalValue)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              )
            ) : (
              <View style={[styles.panel, { backgroundColor: theme.card }]}>
                <View style={styles.summaryRow}>
                  <Text allowFontScaling={false} style={[styles.summaryLabel, { color: theme.text }]}>Capital initial</Text>
                  <Text allowFontScaling={false} style={[styles.summaryValue, { color: theme.text }]}>{formatAmount(endGameResult.startBalance)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text allowFontScaling={false} style={[styles.summaryLabel, { color: theme.text }]}>Cash final</Text>
                  <Text allowFontScaling={false} style={[styles.summaryValue, { color: theme.text }]}>{formatAmount(endGameResult.walletBalance)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text allowFontScaling={false} style={[styles.summaryLabel, { color: theme.text }]}>Valeur des actifs</Text>
                  <Text allowFontScaling={false} style={[styles.summaryValue, { color: theme.text }]}>{formatAmount(endGameResult.assetsValue)}</Text>
                </View>

                <View style={[styles.summaryDivider, { backgroundColor: theme.borderLight }]} />

                <View style={styles.summaryRow}>
                  <View style={styles.finalPortfolioLabelRow}>
                    <Text allowFontScaling={false} style={[styles.summaryLabel, styles.finalPortfolioLabel, { color: theme.text }]}>
                      Portefeuille final
                    </Text>
                    <View style={[styles.profitPill, { backgroundColor: profitChipColor }]}>
                      <Text allowFontScaling={false} style={styles.profitPillText}>{profitText}</Text>
                    </View>
                  </View>
                  <Text allowFontScaling={false} style={[styles.finalPortfolioValue, { color: theme.text }]}>{formatAmount(endGameResult.totalValue)}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {!isDetailedView && (
        <>
        <Text allowFontScaling={false} style={[styles.sectionTitle, styles.objectiveTitle, { color: theme.text }]}>Objectif</Text>

        {primaryGoal && (
          <View style={[styles.goalCard, { backgroundColor: theme.card }]}>
            <Text allowFontScaling={false} style={[styles.goalCardTitle, { color: theme.text }]}>Objectif Principal</Text>
            <View style={styles.goalCardRow}>
              <Text
                allowFontScaling={false}
                style={[
                  styles.goalCardSubtitle,
                  { color: theme.text },
                  (isHistoryMode ? endGameResult?.mandatoryGoalsMet : primaryGoal.validated) && styles.goalReachedText,
                ]}
              >
                {primaryGoal.title}
              </Text>
              <View style={styles.goalIconWrap}>
                <GoalStarIcon
                  filled={isHistoryMode ? (endGameResult?.mandatoryGoalsMet ?? false) : primaryGoal.validated}
                  size={14}
                  idSuffix={`summary-primary-${primaryGoal.id}`}
                />
              </View>
            </View>
          </View>
        )}

        {bonusGoal && (
          <View style={[styles.goalCard, { backgroundColor: theme.card }]}>
            <Text allowFontScaling={false} style={[styles.goalCardTitle, { color: theme.text }]}>Objectif Bonus</Text>
            <View style={styles.goalCardRow}>
              <Text
                allowFontScaling={false}
                style={[
                  styles.goalCardSubtitle,
                  { color: theme.text },
                  (isHistoryMode ? endGameResult?.bonusGoalsMet : bonusGoal.validated) && styles.goalReachedText,
                ]}
              >
                {bonusGoal.title}
              </Text>
              <View style={styles.goalIconWrap}>
                <GoalStarIcon
                  filled={isHistoryMode ? (endGameResult?.bonusGoalsMet ?? false) : bonusGoal.validated}
                  size={14}
                  idSuffix={`summary-bonus-${bonusGoal.id}`}
                />
              </View>
            </View>
          </View>
        )}

        {hasLevelQuiz && (
          shouldShowQuizCta ? (
            <TouchableOpacity style={[styles.quizCtaRow, { backgroundColor: theme.card }]} onPress={handleGoToQuiz} activeOpacity={0.85}>
              <Text allowFontScaling={false} style={[styles.quizCtaTitle, { color: theme.text }]}>Quizz</Text>
              <View style={styles.quizCtaRight}>
                <View style={styles.quizStatusPill}>
                  <Text allowFontScaling={false} style={[styles.quizStatusText, { color: theme.text }]}>À faire</Text>
                </View>
                <View style={styles.quizArrowCircle}>
                  <Ionicons name="arrow-forward" size={18} color={theme.text} />
                </View>
              </View>
            </TouchableOpacity>
          ) : isHistoryMode ? (
            // Mode history : afficher le quiz avec l'état consolidé de UserLevelCompletion
            <View style={[styles.goalCard, { backgroundColor: theme.card }]}>
              <Text allowFontScaling={false} style={[styles.goalCardTitle, { color: theme.text }]}>Quizz</Text>
              <View style={styles.goalCardRow}>
                <Text
                  allowFontScaling={false}
                  style={[styles.goalCardSubtitle, { color: theme.text }, endGameResult?.quizPassed && styles.goalReachedText]}
                >
                  Question aléatoire
                </Text>
                <View style={styles.goalIconWrap}>
                  <GoalStarIcon filled={endGameResult?.quizPassed ?? false} size={14} idSuffix="summary-quiz" />
                </View>
              </View>
            </View>
          ) : isQuizDoneForThisGame ? (
            <View style={[styles.goalCard, { backgroundColor: theme.card }]}>
              <Text allowFontScaling={false} style={[styles.goalCardTitle, { color: theme.text }]}>Quizz</Text>
              <View style={styles.goalCardRow}>
                <Text
                  allowFontScaling={false}
                  style={[styles.goalCardSubtitle, { color: theme.text }, isQuizPassedForThisGame && styles.goalReachedText]}
                >
                  Question aléatoire
                </Text>
                <View style={styles.goalIconWrap}>
                  <GoalStarIcon filled={isQuizPassedForThisGame} size={14} idSuffix="summary-quiz" />
                </View>
              </View>
            </View>
          ) : null
        )}
        </>
        )}
      </ScrollView>

      {user && gameInstance?.level?.id && (
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 10, backgroundColor: theme.background }]}>
          <ActionPillButton
            label={isReplaying ? '...' : 'Rejouer'}
            iconName="refresh-outline"
            onPress={handleReplay}
            disabled={isReplaying}
            isLoading={isReplaying}
          />

          {!isHistoryMode && (
            shouldShowQuizCta ? (
              <ActionPillButton
                label="Quiz"
                customIcon={<QuizActionIcon width={18} height={18} />}
                onPress={handleGoToQuiz}
              />
            ) : (
              !!nextLevel?.id && (
                <ActionPillButton
                  label={`Niveau ${nextLevel.number ?? ''}`.trim()}
                  iconName="play"
                  onPress={handleGoToNextLevel}
                />
              )
            )
          )}
        </View>
      )}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  backButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: 'Roboto',
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: 'Anybody',
    fontWeight: '700',
    marginBottom: 6,
  },
  titleUnderline: {
    height: 3,
    borderRadius: 2,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Anybody',
    fontWeight: '700',
  },
  simpleViewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simpleViewText: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  transactionGroupCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  transactionGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Anybody',
    marginBottom: 8,
    marginTop: 4,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  transactionLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  transactionLabel: {
    fontSize: 14,
    fontFamily: 'Roboto',
    flexShrink: 1,
  },
  transactionLabelFlex: {
    fontSize: 14,
    fontFamily: 'Roboto',
    flex: 1,
    flexShrink: 1,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Roboto',
    flexShrink: 0,
  },
  panel: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    marginTop: 2,
    marginBottom: 10,
  },
  finalPortfolioLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  finalPortfolioLabel: {
    fontWeight: '500',
  },
  finalPortfolioValue: {
    fontSize: 16,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  profitPill: {
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  profitPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  objectiveTitle: {
    marginBottom: 10,
  },
  goalCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  goalCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalCardTitle: {
    fontSize: 14,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  goalCardSubtitle: {
    fontSize: 12,
    fontFamily: 'Roboto',
    fontWeight: '500',
    flex: 1,
  },
  goalReachedText: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  goalIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7B167',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizCtaRow: {
    borderWidth: 2,
    borderColor: '#F4A258',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quizCtaTitle: {
    fontSize: 14,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  quizCtaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quizStatusPill: {
    backgroundColor: '#F7B167',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quizStatusText: {
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  quizArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7B167',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  bottomActionButton: {
  },
  levelContextTitle: {
    fontSize: 16,
    fontFamily: 'Anybody',
    fontWeight: '700',
    marginBottom: 8,
  },
  levelContextDescription: {
    fontSize: 14,
    fontFamily: 'Roboto',
    lineHeight: 20,
  },
});

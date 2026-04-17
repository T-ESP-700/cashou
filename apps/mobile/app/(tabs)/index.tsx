import { ScrollView, View, Text, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { LevelCard } from '@/components/level-card';
import { DailyQuizCard } from '@/components/daily-quiz-card';
import { ScrollingLogos } from '@/components/scrolling-logos';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import { trpcClient } from '@/lib/trpc';
import { Card } from '@/components/ui';

// Types pour les données de la home
interface HomeData {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    points: number | null;
    currentStreak: number;
    maxStreak: number;
  };
  level: {
    id: number;
    number: number | null;
    title: string | null;
    description: string | null;
    startBalance: number | null;
  } | null;
  activeGame: {
    id: number;
    isPaused: boolean | null;
    actionRequired: boolean | null;
    levelNumber: number;
    levelTitle: string | null;
    progression: number;
    currentReturn: number;
  } | null;
  lastCompletedGame: {
    id: number;
    levelId: number | null;
    levelNumber: number | null;
    levelTitle: string | null;
    endedAt: Date | null;
    stars?: number;
    mandatoryGoalsMet?: boolean;
    bonusGoalsMet?: boolean;
    quizPassed?: boolean;
  } | null;
}

const getGreeting = (name: string | null): string => {
  const displayName = name || 'Investisseur';
  return `Bonjour ${displayName} 👋`;
};

// Messages contextuels selon l'état du jeu
const getContextualMessage = (
  homeData: HomeData | null,
  dailyQuizDone: boolean
): string[] => {
  const messages: string[] = [];

  if (!homeData) {
    return ['Chargement de tes données...'];
  }

  const { activeGame, user } = homeData;

  // Message sur la partie en cours
  if (activeGame) {
    if (activeGame.actionRequired) {
      messages.push('Une action de ta part est en attente sur ta partie en cours !');
    } else if (activeGame.isPaused) {
      messages.push('Ta partie est en pause. Reprends quand tu veux !');
    } else if (activeGame.currentReturn > 0) {
      messages.push(`Bravo ! Ton portefeuille est en hausse de ${activeGame.currentReturn}% !`);
    } else if (activeGame.currentReturn < 0) {
      messages.push(`Ton portefeuille est à ${activeGame.currentReturn}%. Les marchés fluctuent, reste concentré !`);
    } else {
      messages.push('Ta partie est en cours, continue sur ta lancée !');
    }
  } else {
    messages.push('Pas de partie en cours. Lance-toi dans un nouveau niveau !');
  }

  // Message sur le daily quiz
  if (!dailyQuizDone) {
    if (user.currentStreak > 0) {
      messages.push(`Tu as une série de ${user.currentStreak} jours ! Fais le quiz pour la maintenir.`);
    } else {
      messages.push('N\'oublie pas le daily quiz pour gagner des points !');
    }
  } else if (user.currentStreak >= 7) {
    messages.push(`Incroyable ! ${user.currentStreak} jours de suite, tu es inarrêtable !`);
  } else if (user.currentStreak >= 3) {
    messages.push(`Belle série de ${user.currentStreak} jours ! Continue comme ça !`);
  }

  return messages;
};

export default function HomeScreen() {
  const { colors, fonts, spacing } = useCashouTheme();
  const { user, isAuthenticated, authResolved, refreshUser } = useAuth();
  const router = useRouter();

  // Configure header for this screen
  useHeaderOptions({ showBackButton: false, title: 'Cashou' });
  const [dailyQuizStatus, setDailyQuizStatus] = useState<'todo' | 'done'>('todo');
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const homeDataRef = React.useRef<HomeData | null>(null);
  const [isLoadingHomeData, setIsLoadingHomeData] = useState(true);
  const [portfolioNetWorth, setPortfolioNetWorth] = useState<number>(0);
  const [portfolioReturn, setPortfolioReturn] = useState<number>(0);
  const [levelCardStatus, setLevelCardStatus] = useState<'not_started' | 'in_progress' | 'completed' | 'quiz_pending'>('not_started');
  const hasLoadedInitialHomeRef = useRef(false);
  const isInitialHomeLoadInFlightRef = useRef(false);
  const shouldSkipNextFocusRefreshRef = useRef(false);

  // Keep ref in sync for use in setInterval (avoids stale closure)
  React.useEffect(() => {
    homeDataRef.current = homeData;
  }, [homeData]);

  // Générer le greeting une seule fois au montage (pour éviter les changements aléatoires)
  const greeting = useMemo(() => {
    const displayName = homeData?.user?.name || homeData?.user?.username || user?.name || null;
    return getGreeting(displayName);
  }, [homeData?.user?.name, homeData?.user?.username, user?.name]);

  // Messages contextuels
  const contextualMessages = useMemo(() => {
    return getContextualMessage(homeData, dailyQuizStatus === 'done');
  }, [homeData, dailyQuizStatus]);

  // Fetch portfolio (wallet + assets) for the active game
  const fetchPortfolio = async (activeGame: HomeData['activeGame'], level: HomeData['level']) => {
    if (!activeGame) {
      setPortfolioNetWorth(0);
      setPortfolioReturn(0);
      return;
    }

    try {
      const wallets = await trpcClient.wallet.getByGameInstance.query({
        gameInstanceId: activeGame.id,
      });

      if (wallets && Array.isArray(wallets) && wallets.length > 0) {
        const walletId = wallets[0].id;

        const portfolio = await trpcClient.investment.getPortfolio.query({
          walletId,
          gameInstanceId: activeGame.id,
        });

        setPortfolioNetWorth(Math.round(portfolio.netWorth));

        const startBalance = level?.startBalance || 0;
        if (startBalance > 0) {
          const returnPct = ((portfolio.netWorth - startBalance) / startBalance) * 100;
          setPortfolioReturn(Math.round(returnPct * 10) / 10);
        } else {
          setPortfolioReturn(0);
        }
      } else {
        setPortfolioNetWorth(level?.startBalance || 0);
        setPortfolioReturn(0);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setPortfolioNetWorth(level?.startBalance || 0);
      setPortfolioReturn(0);
    }
  };

  useEffect(() => {
    fetchPortfolio(homeData?.activeGame ?? null, homeData?.level ?? null);
  }, [homeData?.activeGame?.id]);

  const fetchHomeData = useCallback(async () => {
    if (!authResolved || !isAuthenticated) {
      setHomeData(null);
      setIsLoadingHomeData(false);
      return null;
    }

    try {
      setIsLoadingHomeData(true);
      const result = await trpcClient.auth.getHomeData.query();
      const data = result as HomeData;
      setHomeData(data);
      return data;
    } catch (error) {
      console.error('Error fetching home data:', error);
      setHomeData(null);
      return null;
    } finally {
      setIsLoadingHomeData(false);
    }
  }, [authResolved, isAuthenticated]);

  const fetchDailyQuizStatus = useCallback(async () => {
    if (!authResolved || !isAuthenticated) {
      setDailyQuizStatus('todo');
      return;
    }

    try {
      const result = await trpcClient.userQuiz.hasDoneDailyTodayForCurrentUser.query();
      setDailyQuizStatus(result.hasDone ? 'done' : 'todo');
    } catch (error) {
      console.error('Error fetching daily quiz status:', error);
      setDailyQuizStatus('todo');
    }
  }, [authResolved, isAuthenticated]);

  // Fetch home data
  useEffect(() => {
    const loadInitialHomeData = async () => {
      if (!authResolved) {
        return;
      }

      if (!isAuthenticated) {
        setHomeData(null);
        setIsLoadingHomeData(false);
        hasLoadedInitialHomeRef.current = false;
        isInitialHomeLoadInFlightRef.current = false;
        shouldSkipNextFocusRefreshRef.current = false;
        return;
      }

      isInitialHomeLoadInFlightRef.current = true;
      shouldSkipNextFocusRefreshRef.current = true;
      await Promise.all([fetchHomeData(), fetchDailyQuizStatus()]);
      hasLoadedInitialHomeRef.current = true;
      isInitialHomeLoadInFlightRef.current = false;
    };

    void loadInitialHomeData();
  }, [authResolved, isAuthenticated, fetchHomeData, fetchDailyQuizStatus]);

  // Rafraîchir les données utilisateur et le statut du quiz quand la page revient au focus
  useFocusEffect(
    React.useCallback(() => {
      if (!authResolved || !isAuthenticated) {
        return;
      }

      if (
        shouldSkipNextFocusRefreshRef.current
        || !hasLoadedInitialHomeRef.current
        || isInitialHomeLoadInFlightRef.current
      ) {
        shouldSkipNextFocusRefreshRef.current = false;
      } else {
        void refreshUser();

        void (async () => {
          const data = await fetchHomeData();
          if (data) {
            fetchPortfolio(data.activeGame, data.level);
          }
          await fetchDailyQuizStatus();
        })();
      }

      // Poll portfolio every 10s while the page is focused
      const interval = setInterval(() => {
        const current = homeDataRef.current;
        if (current?.activeGame) {
          fetchPortfolio(current.activeGame, current.level ?? null);
        }
      }, 10000);

      return () => clearInterval(interval);
    }, [authResolved, isAuthenticated, refreshUser, fetchHomeData, fetchDailyQuizStatus])
  );

  // Vérifier si le quiz du niveau est complété pour le dernier niveau complété
  useEffect(() => {
    const checkQuizCompletion = async () => {
      if (!user || !homeData?.lastCompletedGame?.levelId) {
        return;
      }

      const lastCompleted = homeData.lastCompletedGame;
      const currentLevel = homeData.level;

      if (lastCompleted && !currentLevel) {
        try {
          const quizzes = await trpcClient.quiz.getByLevel.query({ levelId: lastCompleted.levelId });
          if (!quizzes || quizzes.length === 0) {
            setLevelCardStatus('completed');
            return;
          }

          const quizId = quizzes[0].id;
          const participations = await trpcClient.userQuiz.getByQuiz.query({ quizId });
          const userParticipation = (participations as any[]).find(
            (p: any) => p.userId === user.id && p.completedAt !== null
          );

          setLevelCardStatus(userParticipation ? 'completed' : 'quiz_pending');
        } catch (err) {
          console.error('Error checking quiz completion:', err);
          setLevelCardStatus('quiz_pending');
        }
      } else {
        setLevelCardStatus('not_started');
      }
    };

    checkQuizCompletion();
  }, [user, homeData]);

  // Données pour le LevelCard
  const levelCardData = useMemo(() => {
    if (homeData?.activeGame) {
      return {
        level: homeData.activeGame.levelNumber,
        levelId: homeData.level?.id,
        title: homeData.activeGame.levelTitle,
        cash: portfolioNetWorth,
        currentReturn: portfolioReturn,
        status: 'in_progress' as const,
        hasGame: true,
        gameId: homeData.activeGame.id,
        stars: 0,
      };
    }

    const lastCompleted = homeData?.lastCompletedGame;
    const currentLevel = homeData?.level;

    if (lastCompleted && currentLevel) {
      return {
        level: currentLevel.number || 1,
        levelId: currentLevel.id,
        title: currentLevel.title,
        cash: 0,
        currentReturn: 0,
        status: 'not_started' as const,
        hasGame: false,
        gameId: null,
        stars: 0,
      };
    }

    if (lastCompleted && !currentLevel) {
      return {
        level: lastCompleted.levelNumber || 1,
        levelId: lastCompleted.levelId ?? undefined,
        title: lastCompleted.levelTitle,
        cash: 0,
        currentReturn: 0,
        status: levelCardStatus,
        hasGame: true,
        gameId: lastCompleted.id,
        stars: lastCompleted.stars ?? 0,
      };
    }

    return {
      level: homeData?.level?.number || 1,
      levelId: homeData?.level?.id,
      title: homeData?.level?.title,
      cash: 0,
      currentReturn: 0,
      status: 'not_started' as const,
      hasGame: false,
      gameId: null,
      stars: 0,
    };
  }, [homeData, levelCardStatus, portfolioNetWorth, portfolioReturn]);

  // Handler pour naviguer vers l'écran de jeu
  const handleLevelPress = () => {
    if (levelCardData.levelId) {
      if (levelCardData.hasGame && levelCardData.gameId) {
        router.push({
          pathname: '/game/current',
          params: {
            levelId: levelCardData.levelId.toString(),
            gameId: levelCardData.gameId.toString()
          }
        });
      } else {
        router.push({
          pathname: '/game/current',
          params: { levelId: levelCardData.levelId.toString() }
        });
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}>
        {isLoadingHomeData ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 1.5 }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <>
            {/* Scrolling logos background filling the empty space */}
            <View style={{ flex: 1, minHeight: 120 }}>
              <ScrollingLogos />
            </View>

            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.lg, gap: 8 }}>
              {/* Greeting bubble */}
              <Card variant="default" padding="md">
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: fonts.body,
                    color: colors.text,
                  }}
                >
                  {greeting}
                </Text>
              </Card>

              {/* Contextual messages — all in one card */}
              {contextualMessages.length > 0 && (
                <Card variant="default" padding="md">
                  {contextualMessages.map((message, index) => (
                    <Text
                      key={index}
                      style={{
                        fontSize: 15,
                        fontFamily: fonts.body,
                        color: colors.text,
                        lineHeight: 22,
                        marginBottom: index < contextualMessages.length - 1 ? spacing.md : 0,
                      }}
                    >
                      {message}
                    </Text>
                  ))}
                </Card>
              )}

            {/* Level Card */}
            {levelCardData.hasGame || homeData?.level ? (
              <LevelCard
                level={levelCardData.level}
                levelId={levelCardData.levelId}
                title={levelCardData.title}
                cash={levelCardData.cash}
                currentReturn={levelCardData.currentReturn}
                status={levelCardData.status}
                isPaused={homeData?.activeGame?.isPaused === true}
                stars={levelCardData.stars}
                onPress={handleLevelPress}
              />
            ) : null}

            {/* Daily Quiz Card */}
            <DailyQuizCard status={dailyQuizStatus} streak={homeData?.user.currentStreak ?? 0} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

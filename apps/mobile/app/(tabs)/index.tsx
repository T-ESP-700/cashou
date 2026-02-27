import { ScrollView, View, Text, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { LevelCard } from '@/components/level-card';
import { DailyQuizCard } from '@/components/daily-quiz-card';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import { trpcClient } from '@/lib/trpc';

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
  } | null;
}

interface UserQuizParticipation {
  userId: string | null;
  completedAt: Date | null;
}

// Messages de bienvenue créatifs selon l'heure et le contexte
const getGreeting = (name: string | null, hour: number): string => {
  const displayName = name || 'Investisseur';

  if (hour >= 5 && hour < 12) {
    const morningGreetings = [
      `Salut ${displayName} !`,
      `Belle matinée ${displayName} !`,
      `Bonjour ${displayName} !`,
      `Hey ${displayName} ! Prêt pour une nouvelle journée ?`,
    ];
    return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
  } else if (hour >= 12 && hour < 18) {
    const afternoonGreetings = [
      `Bon après-midi ${displayName} !`,
      `Hey ${displayName} !`,
      `De retour ${displayName} ?`,
      `Salut ${displayName} ! Les marchés t'attendent`,
    ];
    return afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
  } else {
    const eveningGreetings = [
      `Bonsoir ${displayName} !`,
      `Encore là ${displayName} ?`,
      `Salut ${displayName} ! Session nocturne ?`,
      `Hey ${displayName} ! Dernière analyse du jour ?`,
    ];
    return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
  }
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
  const { user, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();

  // Configure header for this screen
  useHeaderOptions({ showBackButton: false });
  const [dailyQuizStatus, setDailyQuizStatus] = useState<'todo' | 'done'>('todo');
  const [isLoadingDailyQuiz, setIsLoadingDailyQuiz] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('0h0m');
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [isLoadingHomeData, setIsLoadingHomeData] = useState(true);
  const [levelCardStatus, setLevelCardStatus] = useState<'not_started' | 'in_progress' | 'completed' | 'quiz_pending'>('not_started');

  // Générer le greeting une seule fois au montage (pour éviter les changements aléatoires)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const displayName = homeData?.user?.name || homeData?.user?.username || user?.name || null;
    return getGreeting(displayName, hour);
  }, [homeData?.user?.name, homeData?.user?.username, user?.name]);

  // Messages contextuels
  const contextualMessages = useMemo(() => {
    return getContextualMessage(homeData, dailyQuizStatus === 'done');
  }, [homeData, dailyQuizStatus]);

  // Calculer le temps restant avant minuit
  const calculateTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h${minutes}m`;
  };

  // Mettre à jour le temps restant toutes les minutes
  useEffect(() => {
    const updateTime = () => {
      setTimeRemaining(calculateTimeUntilMidnight());
    };

    updateTime(); // Mise à jour immédiate
    const interval = setInterval(updateTime, 60000); // Mise à jour toutes les minutes

    return () => clearInterval(interval);
  }, []);

  // Fetch home data
  useEffect(() => {
    const fetchHomeData = async () => {
      if (!isAuthenticated) {
        setHomeData(null);
        setIsLoadingHomeData(false);
        return;
      }

      try {
        setIsLoadingHomeData(true);
        const result = await trpcClient.auth.getHomeData.query();
        setHomeData(result as HomeData);
      } catch (error) {
        console.error('Error fetching home data:', error);
        setHomeData(null);
      } finally {
        setIsLoadingHomeData(false);
      }
    };

    fetchHomeData();
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchDailyQuizStatus = async () => {
      if (!isAuthenticated) {
        setDailyQuizStatus('todo');
        return;
      }

      try {
        setIsLoadingDailyQuiz(true);
        const result = await trpcClient.userQuiz.hasDoneDailyTodayForCurrentUser.query();
        setDailyQuizStatus(result.hasDone ? 'done' : 'todo');
      } catch (error) {
        console.error('Error fetching daily quiz status:', error);
        setDailyQuizStatus('todo');
      } finally {
        setIsLoadingDailyQuiz(false);
      }
    };

    fetchDailyQuizStatus();
  }, [isAuthenticated]);

  // Rafraîchir les données utilisateur et le statut du quiz quand la page revient au focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        // Rafraîchir les données utilisateur
        refreshUser();

        // Rafraîchir les données de la home
        const fetchHomeData = async () => {
          try {
            const result = await trpcClient.auth.getHomeData.query();
            setHomeData(result as HomeData);
          } catch (error) {
            console.error('Error fetching home data:', error);
          }
        };

        fetchHomeData();

        // Rafraîchir aussi le statut du quiz
        const fetchDailyQuizStatus = async () => {
          try {
            const result = await trpcClient.userQuiz.hasDoneDailyTodayForCurrentUser.query();
            setDailyQuizStatus(result.hasDone ? 'done' : 'todo');
          } catch (error) {
            console.error('Error fetching daily quiz status:', error);
            setDailyQuizStatus('todo');
          }
        };

        fetchDailyQuizStatus();
      }
    }, [isAuthenticated, refreshUser])
  );

  // Vérifier si le quiz du niveau est complété pour le dernier niveau complété
  useEffect(() => {
    const checkQuizCompletion = async () => {
      if (!user || !homeData?.lastCompletedGame?.levelId) {
        return;
      }

      const lastCompleted = homeData.lastCompletedGame;
      const currentLevel = homeData.level;

      // Si on a terminé un niveau mais pas de niveau suivant, vérifier le quiz
      if (lastCompleted && !currentLevel) {
        try {
          // Récupérer le quiz du niveau
          const quizzes = await trpcClient.quiz.getByLevel.query({ levelId: lastCompleted.levelId });
          if (!quizzes || quizzes.length === 0) {
            // Pas de quiz = considéré comme complété
            setLevelCardStatus('completed');
            return;
          }

          const quizId = quizzes[0].id;

          // Vérifier si l'utilisateur a complété ce quiz
          const participations = await trpcClient.userQuiz.getByQuiz.query({ quizId });
          const userParticipation = (participations as UserQuizParticipation[]).find(
            (p) => p.userId === user.id && p.completedAt !== null
          );

          setLevelCardStatus(userParticipation ? 'completed' : 'quiz_pending');
        } catch (err) {
          console.error('Error checking quiz completion:', err);
          setLevelCardStatus('quiz_pending'); // Par défaut quiz_pending en cas d'erreur
        }
      } else {
        // Pas de niveau complété ou niveau suivant disponible
        setLevelCardStatus('not_started');
      }
    };

    checkQuizCompletion();
  }, [user, homeData]);

  // Données pour le LevelCard
  const levelCardData = useMemo(() => {
    // Si une partie est en cours (non terminée)
    if (homeData?.activeGame) {
      return {
        level: homeData.activeGame.levelNumber,
        levelId: homeData.level?.id,
        title: homeData.activeGame.levelTitle,
        progression: homeData.activeGame.progression,
        currentReturn: homeData.activeGame.currentReturn,
        status: 'in_progress' as const,
        hasGame: true,
        gameId: homeData.activeGame.id,
      };
    }

    // Pas de partie en cours
    const lastCompleted = homeData?.lastCompletedGame;
    const currentLevel = homeData?.level;

    if (lastCompleted && currentLevel) {
      // L'utilisateur a un niveau suivant à faire
      return {
        level: currentLevel.number || 1,
        levelId: currentLevel.id,
        title: currentLevel.title,
        progression: 0,
        currentReturn: 0,
        status: 'not_started' as const,
        hasGame: false,
        gameId: null,
      };
    }

    // Si on a terminé un niveau mais pas de niveau suivant (tous les niveaux complétés)
    if (lastCompleted && !currentLevel) {
      return {
        level: lastCompleted.levelNumber || 1,
        levelId: lastCompleted.levelId ?? undefined,
        title: lastCompleted.levelTitle,
        progression: 100,
        currentReturn: 0,
        status: levelCardStatus,
        hasGame: true,
        gameId: lastCompleted.id,
      };
    }

    // Pas de partie en cours et aucune partie terminée → niveau prêt à commencer
    return {
      level: homeData?.level?.number || 1,
      levelId: homeData?.level?.id,
      title: homeData?.level?.title,
      progression: 0,
      currentReturn: 0,
      status: 'not_started' as const,
      hasGame: false,
      gameId: null,
    };
  }, [homeData, levelCardStatus]);

  // Handler pour naviguer vers l'écran de jeu
  const handleLevelPress = () => {
    if (levelCardData.levelId) {
      // Si une partie est en cours, inclure le gameId pour éviter la popup d'info
      if (levelCardData.hasGame && levelCardData.gameId) {
        router.push({
          pathname: '/game/current',
          params: {
            levelId: levelCardData.levelId.toString(),
            gameId: levelCardData.gameId.toString()
          }
        });
      } else {
        // Nouvelle partie: aller directement à l'écran de jeu (la popup d'info s'affichera automatiquement)
        router.push({
          pathname: '/game/current',
          params: { levelId: levelCardData.levelId.toString() }
        });
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Content */}
      <ScrollView style={{ flex: 1 }}>
        {/* Loading State */}
        {isLoadingHomeData ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 1.5 }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <>
            {/* Greeting Section */}
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.lg }}>
              <Text
                style={{
                  fontSize: 28,
                  fontFamily: fonts.heading,
                  color: colors.text,
                  marginBottom: spacing.sm + 4,
                }}
              >
                {greeting}
              </Text>
              {contextualMessages.map((message, index) => (
                <Text
                  key={index}
                  style={{
                    fontSize: 15,
                    fontFamily: fonts.body,
                    color: colors.text,
                    marginBottom: spacing.sm,
                    lineHeight: 22,
                    opacity: 0.9,
                  }}
                >
                  {message}
                </Text>
              ))}
            </View>

            {/* Level Card - only show if user has a game or level */}
            {levelCardData.hasGame || homeData?.level ? (
              <LevelCard
                level={levelCardData.level}
                levelId={levelCardData.levelId}
                title={levelCardData.title}
                progression={levelCardData.progression}
                currentReturn={levelCardData.currentReturn}
                status={levelCardData.status}
                onPress={handleLevelPress}
              />
            ) : null}

            {/* Daily Quiz Card */}
            {(() => {
              const streakValue = homeData?.user?.currentStreak ?? user?.currentStreak ?? 0;
              return (
                <DailyQuizCard
                  winStreak={streakValue}
                  timeRemaining={timeRemaining}
                  status={dailyQuizStatus}
                />
              );
            })()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

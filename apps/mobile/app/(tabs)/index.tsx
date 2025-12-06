import { ScrollView, View, Text, useColorScheme as useRNColorScheme, StyleSheet, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { LevelCard } from '@/components/level-card';
import { DailyQuizCard } from '@/components/daily-quiz-card';
import { CashouTheme } from '@/constants/cashou-theme';
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

// Messages de bienvenue créatifs selon l'heure et le contexte
const getGreeting = (name: string | null, hour: number): string => {
  const displayName = name || 'Investisseur';

  if (hour >= 5 && hour < 12) {
    const morningGreetings = [
      `Salut ${displayName} ! ☀️`,
      `Belle matinée ${displayName} ! 🌅`,
      `Bonjour ${displayName} ! ☕`,
      `Hey ${displayName} ! Prêt pour une nouvelle journée ? 🚀`,
    ];
    return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
  } else if (hour >= 12 && hour < 18) {
    const afternoonGreetings = [
      `Bon après-midi ${displayName} ! 🌤️`,
      `Hey ${displayName} ! 👋`,
      `De retour ${displayName} ? 📈`,
      `Salut ${displayName} ! Les marchés t'attendent 💹`,
    ];
    return afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
  } else {
    const eveningGreetings = [
      `Bonsoir ${displayName} ! 🌙`,
      `Encore là ${displayName} ? 🦉`,
      `Salut ${displayName} ! Session nocturne ? 🌃`,
      `Hey ${displayName} ! Dernière analyse du jour ? 📊`,
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
      messages.push('🔔 Une action de ta part est en attente sur ta partie en cours !');
    } else if (activeGame.isPaused) {
      messages.push('⏸️ Ta partie est en pause. Reprends quand tu veux !');
    } else if (activeGame.currentReturn > 0) {
      messages.push(`📈 Bravo ! Ton portefeuille est en hausse de ${activeGame.currentReturn}% !`);
    } else if (activeGame.currentReturn < 0) {
      messages.push(`📉 Ton portefeuille est à ${activeGame.currentReturn}%. Les marchés fluctuent, reste concentré !`);
    } else {
      messages.push('🎮 Ta partie est en cours, continue sur ta lancée !');
    }
  } else {
    messages.push('🎯 Pas de partie en cours. Lance-toi dans un nouveau niveau !');
  }

  // Message sur le daily quiz
  if (!dailyQuizDone) {
    if (user.currentStreak > 0) {
      messages.push(`🔥 Tu as une série de ${user.currentStreak} jours ! Fais le quiz pour la maintenir.`);
    } else {
      messages.push('📝 N\'oublie pas le daily quiz pour gagner des points !');
    }
  } else if (user.currentStreak >= 7) {
    messages.push(`🏆 Incroyable ! ${user.currentStreak} jours de suite, tu es inarrêtable !`);
  } else if (user.currentStreak >= 3) {
    messages.push(`✨ Belle série de ${user.currentStreak} jours ! Continue comme ça !`);
  }

  return messages;
};

export default function HomeScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const { user, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();

  // Configure header for this screen
  useHeaderOptions({ showBackButton: false });
  const [dailyQuizStatus, setDailyQuizStatus] = useState<'todo' | 'done'>('todo');
  const [isLoadingDailyQuiz, setIsLoadingDailyQuiz] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('0h0m');
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [isLoadingHomeData, setIsLoadingHomeData] = useState(true);

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
  // Cela permet de mettre à jour le currentStreak et le statut du quiz après avoir complété un quiz
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
    // Vérifier si le dernier niveau complété est le même que le niveau actuel de l'utilisateur - 1
    // (ce qui signifie que l'utilisateur vient de terminer un niveau et peut voir le suivant)
    const lastCompleted = homeData?.lastCompletedGame;
    const currentLevel = homeData?.level;

    // Si on a terminé un niveau récemment et que c'est le niveau juste avant le niveau actuel
    // → Afficher le niveau actuel comme "prêt à commencer"
    // Sinon si on a terminé un niveau et qu'on n'a pas de niveau suivant
    // → Afficher le dernier niveau comme "terminé"
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
        status: 'completed' as const,
        hasGame: true, // On a une partie (terminée)
        gameId: lastCompleted.id, // ID de la partie terminée
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
  }, [homeData]);

  // Handler pour naviguer vers la description du niveau
  const handleLevelPress = () => {
    if (levelCardData.levelId) {
      // Si une partie est en cours, aller directement à l'écran de jeu
      if (levelCardData.hasGame && levelCardData.gameId) {
        router.push({
          pathname: '/game/current',
          params: {
            levelId: levelCardData.levelId.toString(),
            gameId: levelCardData.gameId.toString()
          }
        });
      } else {
        // Sinon, aller à la description du niveau
        router.push({
          pathname: '/game/description',
          params: { levelId: levelCardData.levelId.toString() }
        });
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Content */}
      <ScrollView style={styles.scrollView}>
        {/* Loading State */}
        {isLoadingHomeData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : (
          <>
            {/* Greeting Section */}
            <View style={styles.greetingSection}>
              <Text
                style={[styles.greeting, { fontFamily: CashouTheme.fonts.heading, color: theme.text }]}
              >
                {greeting}
              </Text>
              {contextualMessages.map((message, index) => (
                <Text
                  key={index}
                  style={[styles.message, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  greetingSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  greeting: {
    fontSize: 28,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
    opacity: 0.9,
  },
});

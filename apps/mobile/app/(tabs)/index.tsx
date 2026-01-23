import { ScrollView, View, Text, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { LevelCard } from '@/components/level-card';
import { DailyQuizCard } from '@/components/daily-quiz-card';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import { trpc } from '@/lib/trpc';

// Types for home data
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

// Creative greeting messages based on time and context
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

// Contextual messages based on game state
const getContextualMessage = (
  homeData: HomeData | null,
  dailyQuizDone: boolean
): string[] => {
  const messages: string[] = [];

  if (!homeData) {
    return ['Chargement de tes données...'];
  }

  const { activeGame, user } = homeData;

  // Message about current game
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

  // Message about daily quiz
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
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Configure header for this screen
  useHeaderOptions({ showBackButton: false });

  const [timeRemaining, setTimeRemaining] = useState<string>('0h0m');
  const [levelCardStatus, setLevelCardStatus] = useState<'not_started' | 'in_progress' | 'completed' | 'quiz_pending'>('not_started');

  // React Query: Fetch home data
  const {
    data: homeData,
    isLoading: isLoadingHomeData,
  } = trpc.auth.getHomeData.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // React Query: Fetch daily quiz status
  const {
    data: dailyQuizResult,
    isLoading: isLoadingDailyQuiz,
  } = trpc.userQuiz.hasDoneDailyTodayForCurrentUser.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const dailyQuizStatus = dailyQuizResult?.hasDone ? 'done' : 'todo';

  // Generate greeting only once on mount (to avoid random changes)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const displayName = (homeData as HomeData)?.user?.name || (homeData as HomeData)?.user?.username || user?.name || null;
    return getGreeting(displayName, hour);
  }, [(homeData as HomeData)?.user?.name, (homeData as HomeData)?.user?.username, user?.name]);

  // Contextual messages
  const contextualMessages = useMemo(() => {
    return getContextualMessage(homeData as HomeData | null, dailyQuizStatus === 'done');
  }, [homeData, dailyQuizStatus]);

  // Calculate time until midnight
  const calculateTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h${minutes}m`;
  };

  // Update time remaining every minute
  useEffect(() => {
    const updateTime = () => {
      setTimeRemaining(calculateTimeUntilMidnight());
    };

    updateTime(); // Immediate update
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Check if level quiz is completed for last completed level
  // React Query for level quiz check
  const lastCompletedLevelId = (homeData as HomeData)?.lastCompletedGame?.levelId;
  const hasCurrentLevel = !!(homeData as HomeData)?.level;

  const { data: quizzesForLevel } = trpc.quiz.getByLevel.useQuery(
    { levelId: lastCompletedLevelId! },
    {
      enabled: !!lastCompletedLevelId && !hasCurrentLevel && !!user,
      staleTime: 1000 * 60 * 5,
    }
  );

  const quizIdToCheck = quizzesForLevel?.[0]?.id;

  const { data: quizParticipations } = trpc.userQuiz.getByQuiz.useQuery(
    { quizId: quizIdToCheck! },
    {
      enabled: !!quizIdToCheck && !!user,
      staleTime: 1000 * 60 * 5,
    }
  );

  // Update level card status based on quiz completion
  useEffect(() => {
    if (!user || !(homeData as HomeData)?.lastCompletedGame?.levelId) {
      return;
    }

    const lastCompleted = (homeData as HomeData)?.lastCompletedGame;
    const currentLevel = (homeData as HomeData)?.level;

    if (lastCompleted && !currentLevel) {
      // No quiz = considered completed
      if (!quizzesForLevel || quizzesForLevel.length === 0) {
        setLevelCardStatus('completed');
        return;
      }

      // Check if user completed the quiz
      const userParticipation = (quizParticipations as any[] | undefined)?.find(
        (p: any) => p.userId === user.id && p.completedAt !== null
      );

      setLevelCardStatus(userParticipation ? 'completed' : 'quiz_pending');
    } else {
      setLevelCardStatus('not_started');
    }
  }, [user, homeData, quizzesForLevel, quizParticipations]);

  // Data for LevelCard
  const levelCardData = useMemo(() => {
    const typedHomeData = homeData as HomeData | undefined;

    // If a game is in progress (not ended)
    if (typedHomeData?.activeGame) {
      return {
        level: typedHomeData.activeGame.levelNumber,
        levelId: typedHomeData.level?.id,
        title: typedHomeData.activeGame.levelTitle,
        progression: typedHomeData.activeGame.progression,
        currentReturn: typedHomeData.activeGame.currentReturn,
        status: 'in_progress' as const,
        hasGame: true,
        gameId: typedHomeData.activeGame.id,
      };
    }

    // No game in progress
    const lastCompleted = typedHomeData?.lastCompletedGame;
    const currentLevel = typedHomeData?.level;

    if (lastCompleted && currentLevel) {
      // User has a next level to play
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

    // Completed a level but no next level (all levels completed)
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

    // No game in progress and no completed game -> level ready to start
    return {
      level: typedHomeData?.level?.number || 1,
      levelId: typedHomeData?.level?.id,
      title: typedHomeData?.level?.title,
      progression: 0,
      currentReturn: 0,
      status: 'not_started' as const,
      hasGame: false,
      gameId: null,
    };
  }, [homeData, levelCardStatus]);

  // Handler to navigate to game screen
  const handleLevelPress = () => {
    if (levelCardData.levelId) {
      // If a game is in progress, include gameId to skip info popup
      if (levelCardData.hasGame && levelCardData.gameId) {
        router.push({
          pathname: '/game/current',
          params: {
            levelId: levelCardData.levelId.toString(),
            gameId: levelCardData.gameId.toString()
          }
        });
      } else {
        // New game: go directly to game screen (info popup will show automatically)
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
            {levelCardData.hasGame || (homeData as HomeData)?.level ? (
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
              const streakValue = (homeData as HomeData)?.user?.currentStreak ?? user?.currentStreak ?? 0;
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

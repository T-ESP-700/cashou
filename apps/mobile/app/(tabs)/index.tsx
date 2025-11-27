import { ScrollView, View, Text, useColorScheme as useRNColorScheme, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { CashouHeader } from '@/components/cashou-header';
import { LevelCard } from '@/components/level-card';
import { DailyQuizCard } from '@/components/daily-quiz-card';
import { CashouTheme } from '@/constants/cashou-theme';
import { useAuth } from '@/hooks/use-auth';
import { trpcClient } from '@/lib/trpc';

export default function HomeScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [dailyQuizStatus, setDailyQuizStatus] = useState<'todo' | 'done'>('todo');
  const [isLoadingDailyQuiz, setIsLoadingDailyQuiz] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('0h0m');

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <CashouHeader
        showBackButton={true}
        onMenuPress={() => console.log('Menu pressed')}
      />

      {/* Content */}
      <ScrollView style={styles.scrollView}>
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text
            style={[styles.greeting, { fontFamily: CashouTheme.fonts.heading, color: theme.text }]}
          >
            Bonjour John 👋
          </Text>
          <Text
            style={[styles.message, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}
          >
            Tu as une partie en cours avec une action de ta part en attente.
          </Text>
          <Text
            style={[styles.message, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}
          >
            N'oublie pas le daily quiz du jour pour garder ta win streak !
          </Text>
        </View>

        {/* Level Card */}
        <LevelCard
          level={12}
          progression={48}
          currentReturn={28}
          status="in_progress"
        />

        {/* Daily Quiz Card */}
        {(() => {
          const streakValue = user?.currentStreak ?? 0;
          console.log('[HomeScreen] Rendering DailyQuizCard with currentStreak:', streakValue, 'user object:', user);
          return (
            <DailyQuizCard
              winStreak={streakValue}
              timeRemaining={timeRemaining}
              status={dailyQuizStatus}
            />
          );
        })()}
        
        {/* Texte de vérification temporaire */}
        <View style={styles.verificationContainer}>
          <Text
            style={[
              styles.verificationText,
              { fontFamily: CashouTheme.fonts.body, color: theme.text },
            ]}
          >
            Quiz fait aujourd'hui : {dailyQuizStatus === 'done' ? 'Oui' : 'Non'}
          </Text>
        </View>
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
  greetingSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  greeting: {
    fontSize: 30,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
  },
  verificationContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  verificationText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

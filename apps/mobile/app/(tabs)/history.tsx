import { View, Text, useColorScheme as useRNColorScheme, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';

interface DayStatus {
  date: Date;
  hasQuiz: boolean;
  isCompleted: boolean;
  quizId?: number;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  // Configure header for this screen
  useHeaderOptions({ showBackButton: true, onBackPress: () => router.back() });

  // Commencer au mois en cours, mais ne pas pouvoir naviguer avant Octobre 2025
  const today = new Date();
  const minDate = new Date(2025, 9, 1); // Octobre 2025 (mois 9 car 0-indexed)
  
  // Initialiser avec le mois en cours, ou Octobre 2025 si on est avant
  const initialDate = today >= minDate ? today : minDate;
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [daysStatus, setDaysStatus] = useState<DayStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();
  
  // Vérifier si on est au minimum (Octobre 2025)
  const isAtMinDate = currentMonth === minDate.getMonth() && currentYear === minDate.getFullYear();

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Obtenir le premier jour du mois et le nombre de jours
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Dimanche, 1 = Lundi, etc.

  // Ajuster pour que Lundi = 0
  const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  // Fonction pour récupérer le statut des jours
  const fetchDaysStatus = useCallback(async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Créer un tableau de dates pour le mois
        const dates: Date[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
          dates.push(new Date(currentYear, currentMonth, day));
        }

        // Pour chaque date, vérifier si un quiz existe et s'il est complété
        const statusPromises = dates.map(async (date): Promise<DayStatus> => {
          try {
            // Chercher le quiz daily pour cette date
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            // Récupérer tous les quiz daily
            const allQuizzes = await trpcClient.quiz.getByType.query({ type: 'DAILY' });
            const dailyQuizzes = allQuizzes as any[];

            // Trouver le quiz pour cette date
            let quizForDate = null;
            for (const quiz of dailyQuizzes) {
              const quizDate = quiz.date ? new Date(quiz.date) : new Date(quiz.createdAt);
              const quizDateStart = new Date(quizDate);
              quizDateStart.setHours(0, 0, 0, 0);
              const quizDateEnd = new Date(quizDate);
              quizDateEnd.setHours(23, 59, 59, 999);
              
              // Comparer les dates (sans l'heure)
              if (quizDateStart.getTime() === startOfDay.getTime()) {
                quizForDate = quiz;
                break;
              }
            }

            if (!quizForDate) {
              return {
                date,
                hasQuiz: false,
                isCompleted: false,
              };
            }

            // Vérifier si l'utilisateur a complété ce quiz
            // On vérifie d'abord si toutes les questions ont été répondues
            const questionsData = await trpcClient.quizQuestion.getQuestionsWithAnswers.query({
              quizId: quizForDate.id,
            });

            if (questionsData.length === 0) {
              return {
                date,
                hasQuiz: true,
                isCompleted: false,
                quizId: quizForDate.id,
              };
            }

            // Vérifier si l'utilisateur a répondu à toutes les questions
            const allQuestionsAnswered = await Promise.all(
              questionsData.map(async (qq: any) => {
                try {
                  const userAnswer = await trpcClient.userAnswer.getByUserAndQuestion.query({
                    userId: user.id,
                    questionId: qq.question.id,
                  });
                  return userAnswer !== null;
                } catch {
                  return false;
                }
              })
            );

            const allAnswered = allQuestionsAnswered.every((answered: boolean) => answered);

            // Si toutes les questions sont répondues, vérifier si le quiz est complété
            if (allAnswered) {
              const participations = await trpcClient.userQuiz.getByQuiz.query({
                quizId: quizForDate.id,
              });

              const userParticipation = (participations as any[]).find(
                (p: any) => p.userId === user.id && p.completedAt !== null
              );

              return {
                date,
                hasQuiz: true,
                isCompleted: userParticipation !== undefined,
                quizId: quizForDate.id,
              };
            }

            // Si toutes les questions ne sont pas répondues, le quiz n'est pas complété
            return {
              date,
              hasQuiz: true,
              isCompleted: false,
              quizId: quizForDate.id,
            };
          } catch (error) {
            console.error(`Error fetching status for date ${date.toISOString()}:`, error);
            return {
              date,
              hasQuiz: false,
              isCompleted: false,
            };
          }
        });

        const statuses = await Promise.all(statusPromises);
        setDaysStatus(statuses);
      } catch (error) {
        console.error('Error fetching days status:', error);
      } finally {
        setIsLoading(false);
      }
    }, [user, currentYear, currentMonth, daysInMonth]);

  // Rafraîchir les données quand on revient sur la page
  useFocusEffect(
    useCallback(() => {
      fetchDaysStatus();
    }, [fetchDaysStatus])
  );

  // Rafraîchir aussi quand le mois change
  useEffect(() => {
    fetchDaysStatus();
  }, [fetchDaysStatus]);

  const goToPreviousMonth = () => {
    if (!isAtMinDate) {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    }
  };

  const goToNextMonth = () => {
    if (!isCurrentMonth) {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    }
  };

  const getDayStatus = (day: number): DayStatus | null => {
    const dayDate = new Date(currentYear, currentMonth, day);
    return daysStatus.find(
      (status) =>
        status.date.getDate() === dayDate.getDate() &&
        status.date.getMonth() === dayDate.getMonth() &&
        status.date.getFullYear() === dayDate.getFullYear()
    ) || null;
  };

  const handleDayPress = (dayStatus: DayStatus) => {
    if (!dayStatus.hasQuiz || !dayStatus.quizId) return;

    // Naviguer vers la page du quiz avec le quizId et le statut
    router.push({
      pathname: '/(tabs)/daily-quiz',
      params: {
        quizId: dayStatus.quizId.toString(),
        showCompleted: dayStatus.isCompleted ? 'true' : 'false',
      },
    });
  };

  const renderDay = (day: number) => {
    const dayStatus = getDayStatus(day);
    const dayDate = new Date(currentYear, currentMonth, day);
    
    // Vérifier si le jour est dans le futur
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const dayDateStart = new Date(dayDate);
    dayDateStart.setHours(0, 0, 0, 0);
    const isFuture = dayDateStart.getTime() > todayStart.getTime();
    
    // Si c'est une date future, afficher comme les cases sans quiz
    if (isFuture) {
      return (
        <View
          key={day}
          style={[
            styles.dayCell,
            {
              backgroundColor: 'transparent',
              borderColor: theme.border,
              opacity: 0.3,
            },
          ]}
        >
          <Text
            style={[
              styles.dayNumber,
              {
                fontFamily: CashouTheme.fonts.body,
                color: theme.text,
              },
            ]}
          >
            {day}
          </Text>
        </View>
      );
    }
    
    const hasQuiz = dayStatus?.hasQuiz || false;
    const isCompleted = dayStatus?.isCompleted || false;

    // Déterminer la couleur de fond selon l'état
    let backgroundColor = 'transparent';
    if (hasQuiz) {
      if (isCompleted) {
        backgroundColor = '#4CAF50'; // Vert pour complété
      } else {
        backgroundColor = theme.accent; // Orange pour à faire
      }
    }

    return (
      <TouchableOpacity
        key={day}
        style={[
          styles.dayCell,
          {
            backgroundColor: backgroundColor,
            borderColor: theme.border,
            opacity: hasQuiz ? 1 : 0.3,
          },
        ]}
        onPress={() => dayStatus && handleDayPress(dayStatus)}
        disabled={!hasQuiz || isFuture}
        activeOpacity={hasQuiz && !isFuture ? 0.7 : 1}
      >
        <Text
          style={[
            styles.dayNumber,
            {
              fontFamily: CashouTheme.fonts.body,
              color: hasQuiz ? '#FFFFFF' : theme.text,
            },
          ]}
        >
          {day}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header avec mois, année et flèches */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={[styles.navButton, isAtMinDate && styles.navButtonDisabled]}
            onPress={goToPreviousMonth}
            disabled={isAtMinDate}
            activeOpacity={0.7}
          >
            <Text style={[styles.navButtonText, { color: isAtMinDate ? theme.border : theme.accent }]}>←</Text>
          </TouchableOpacity>

          <View style={styles.monthYearContainer}>
            <Text
              style={[
                styles.monthYearText,
                { fontFamily: CashouTheme.fonts.heading, color: theme.text },
              ]}
            >
              {monthNames[currentMonth]} {currentYear}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.navButton, !isCurrentMonth && styles.navButtonActive]}
            onPress={goToNextMonth}
            disabled={isCurrentMonth}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navButtonText,
                { color: isCurrentMonth ? theme.border : theme.accent },
              ]}
            >
              →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Jours de la semaine */}
        <View style={styles.weekDaysContainer}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <View key={day} style={styles.weekDay}>
              <Text
                style={[
                  styles.weekDayText,
                  { fontFamily: CashouTheme.fonts.body, color: theme.text },
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Grille du calendrier */}
        <View style={styles.calendarGrid}>
          {/* Cases vides pour les jours avant le premier du mois */}
          {Array.from({ length: adjustedStartingDay }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.dayCell} />
          ))}

          {/* Jours du mois */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => renderDay(day))}
        </View>

        {/* Légende */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.legendText, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
              Quiz complété
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, { backgroundColor: theme.accent }]} />
            <Text style={[styles.legendText, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
              Quiz à faire
            </Text>
          </View>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonActive: {
    opacity: 1,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  monthYearContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 24,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 14,
    opacity: 0.7,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  legendText: {
    fontSize: 14,
  },
});


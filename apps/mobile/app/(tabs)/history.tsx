import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CashouTheme } from '@/constants/cashou-theme';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import { Card } from '@/components/ui';

interface DayStatus {
  date: Date;
  hasQuiz: boolean;
  isCompleted: boolean;
  quizId?: number;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors: theme, isDark } = useCashouTheme();

  useHeaderOptions({ showBackButton: true, onBackPress: () => router.back(), title: 'Historique' });

  const today = new Date();
  const minDate = new Date(2025, 9, 1);
  const initialDate = today >= minDate ? today : minDate;
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [daysStatus, setDaysStatus] = useState<DayStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const isAtMinDate = currentMonth === minDate.getMonth() && currentYear === minDate.getFullYear();

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  // Stats du mois
  const quizDone = daysStatus.filter((d) => d.isCompleted).length;
  const quizTotal = daysStatus.filter((d) => d.hasQuiz).length;

  const fetchDaysStatus = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const dates: Date[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(currentYear, currentMonth, day));
      }

      const statusPromises = dates.map(async (date): Promise<DayStatus> => {
        try {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);

          const allQuizzes = await trpcClient.quiz.getByType.query({ type: 'DAILY' });
          const dailyQuizzes = allQuizzes as any[];

          let quizForDate = null;
          for (const quiz of dailyQuizzes) {
            const quizDate = quiz.date ? new Date(quiz.date) : new Date(quiz.createdAt);
            const quizDateStart = new Date(quizDate);
            quizDateStart.setHours(0, 0, 0, 0);
            if (quizDateStart.getTime() === startOfDay.getTime()) {
              quizForDate = quiz;
              break;
            }
          }

          if (!quizForDate) {
            return { date, hasQuiz: false, isCompleted: false };
          }

          const questionsData = await trpcClient.quizQuestion.getQuestionsWithAnswers.query({
            quizId: quizForDate.id,
          });

          if (questionsData.length === 0) {
            return { date, hasQuiz: true, isCompleted: false, quizId: quizForDate.id };
          }

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

          return { date, hasQuiz: true, isCompleted: false, quizId: quizForDate.id };
        } catch (error) {
          console.error(`Error fetching status for date ${date.toISOString()}:`, error);
          return { date, hasQuiz: false, isCompleted: false };
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

  useFocusEffect(
    useCallback(() => {
      fetchDaysStatus();
    }, [fetchDaysStatus])
  );

  useEffect(() => {
    fetchDaysStatus();
  }, [fetchDaysStatus]);

  const goToPreviousMonth = () => {
    if (!isAtMinDate) setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const goToNextMonth = () => {
    if (!isCurrentMonth) setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const getDayStatus = (day: number): DayStatus | null => {
    const dayDate = new Date(currentYear, currentMonth, day);
    return daysStatus.find(
      (s) =>
        s.date.getDate() === dayDate.getDate() &&
        s.date.getMonth() === dayDate.getMonth() &&
        s.date.getFullYear() === dayDate.getFullYear()
    ) || null;
  };

  const handleDayPress = (dayStatus: DayStatus) => {
    if (!dayStatus.hasQuiz || !dayStatus.quizId) return;
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
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const dayDateStart = new Date(dayDate);
    dayDateStart.setHours(0, 0, 0, 0);
    const isFuture = dayDateStart.getTime() > todayStart.getTime();
    const isToday = dayDateStart.getTime() === todayStart.getTime();

    if (isFuture) {
      return (
        <View key={day} style={[styles.dayCell, { opacity: 0.25 }]}>
          <Text style={[styles.dayNumber, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>{day}</Text>
        </View>
      );
    }

    const hasQuiz = dayStatus?.hasQuiz || false;
    const isCompleted = dayStatus?.isCompleted || false;

    let bgColor = 'transparent';
    let textColor = theme.text;
    if (hasQuiz && isCompleted) {
      bgColor = '#88D498';
      textColor = '#FFFFFF';
    } else if (hasQuiz && !isCompleted) {
      bgColor = theme.accent;
      textColor = '#FFFFFF';
    }

    return (
      <TouchableOpacity
        key={day}
        style={[
          styles.dayCell,
          {
            backgroundColor: bgColor,
            opacity: hasQuiz ? 1 : 0.3,
          },
          isToday && !hasQuiz && { borderWidth: 2, borderColor: theme.text },
        ]}
        onPress={() => dayStatus && handleDayPress(dayStatus)}
        disabled={!hasQuiz}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dayNumber,
            {
              fontFamily: CashouTheme.fonts.body,
              color: hasQuiz ? CashouTheme.colors.special.white : theme.text,
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
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}>

        {/* Calendrier */}
        <Card variant="default" padding="md">
          {/* Navigation mois */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              onPress={goToPreviousMonth}
              disabled={isAtMinDate}
              activeOpacity={0.7}
              style={[styles.navButton, { backgroundColor: isAtMinDate ? theme.borderLight : theme.accent }]}
            >
              <Ionicons name="chevron-back" size={18} color={isAtMinDate ? theme.text : '#1C1E33'} />
            </TouchableOpacity>

            <Text style={{ fontSize: 18, fontFamily: CashouTheme.fonts.body, color: theme.text }}>
              {monthNames[currentMonth]} {currentYear}
            </Text>

            <TouchableOpacity
              onPress={goToNextMonth}
              disabled={isCurrentMonth}
              activeOpacity={0.7}
              style={[styles.navButton, { backgroundColor: isCurrentMonth ? theme.borderLight : theme.accent }]}
            >
              <Ionicons name="chevron-forward" size={18} color={isCurrentMonth ? theme.text : '#1C1E33'} />
            </TouchableOpacity>
          </View>

          {/* Jours de la semaine */}
          <View style={styles.weekDaysRow}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
              <View key={i} style={styles.weekDayCell}>
                <Text style={{ fontSize: 13, fontFamily: CashouTheme.fonts.body, color: theme.text, opacity: 0.5 }}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Grille */}
          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          ) : (
            <View style={styles.calendarGrid}>
              {Array.from({ length: adjustedStartingDay }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => renderDay(day))}
            </View>
          )}

        {/* Légende */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, { backgroundColor: CashouTheme.colors.status.success }]} />
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
        </Card>
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
    paddingTop: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 14,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.15)',
  },
  legendText: {
    fontSize: 14,
  },
});

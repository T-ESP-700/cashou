import { View, Text, useColorScheme as useRNColorScheme, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import { CacheInvalidation } from '@/lib/cache-utils';

interface Quiz {
  id: number;
  title: string | null;
  description: string | null;
  type: string | null;
}

interface Answer {
  id: number;
  text: string | null;
  isCorrect: boolean | null;
}

interface Question {
  id: number;
  text: string | null;
  explanation: string | null;
  answers: Answer[];
}

type QuizState = 'intro' | 'question' | 'completed' | 'correction';

export default function DailyQuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  // Configure header for this screen
  useHeaderOptions({ showBackButton: true, onBackPress: () => router.back() });

  // Parse params
  const showCompletedParam = params?.showCompleted;
  const showCompleted = Array.isArray(showCompletedParam)
    ? showCompletedParam[0] === 'true'
    : showCompletedParam === 'true';

  const quizIdParam = params?.quizId;
  const specificQuizId = Array.isArray(quizIdParam)
    ? quizIdParam[0]
    : quizIdParam;

  // Local state
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [hasStartedQuiz, setHasStartedQuiz] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Map<number, { answerId: number; isCorrect: boolean }>>(new Map());
  const [correctionQuestionIndex, setCorrectionQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%'], []);

  // ============ QUERIES ============

  // Fetch quiz (daily or specific)
  const {
    data: quizData,
    isLoading: isLoadingQuiz,
    error: quizError,
  } = specificQuizId
    ? trpc.quiz.getById.useQuery(
        { id: parseInt(specificQuizId) },
        { enabled: !isNaN(parseInt(specificQuizId)) }
      )
    : trpc.quiz.getTodaysDailyQuiz.useQuery();

  const quiz = quizData as Quiz | null;

  // Fetch questions with answers
  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
  } = trpc.quizQuestion.getQuestionsWithAnswers.useQuery(
    { quizId: quiz?.id! },
    {
      enabled: !!quiz?.id,
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  );

  // Transform questions data
  const questions: Question[] = useMemo(() => {
    if (!questionsData) return [];
    return questionsData.map((qq: any) => ({
      id: qq.question.id,
      text: qq.question.text,
      explanation: qq.question.explanation,
      answers: qq.question.answers.map((a: any) => ({
        id: a.id,
        text: a.text,
        isCorrect: a.isCorrect,
      })),
    }));
  }, [questionsData]);

  // Fetch quiz participations to check if completed
  const { data: participationsData } = trpc.userQuiz.getByQuiz.useQuery(
    { quizId: quiz?.id! },
    {
      enabled: !!quiz?.id && !!user,
      staleTime: 1000 * 60 * 2,
    }
  );

  // ============ MUTATIONS ============

  const submitAnswerMutation = trpc.userAnswer.submitAnswer.useMutation({
    onSuccess: () => {
      // Invalidate user answers cache
      queryClient.invalidateQueries({ queryKey: [['userAnswer']] });
    },
  });

  const completeQuizMutation = trpc.userQuiz.createOrUpdateParticipation.useMutation({
    onSuccess: () => {
      // Use centralized invalidation to ensure all related caches are updated
      // This includes: userQuiz, daily quiz status, home data, and user streak
      CacheInvalidation.quizCompleted(queryClient);
    },
  });

  // ============ EFFECTS ============

  // Reset bottom sheet when changing question in correction
  useEffect(() => {
    if (quizState === 'correction') {
      bottomSheetRef.current?.close();
    }
  }, [correctionQuestionIndex, quizState]);

  // Determine initial quiz state
  useEffect(() => {
    if (!quiz || !user || isLoadingQuestions || quizState === 'correction') return;

    const determineQuizState = async () => {
      // If coming from history with showCompleted=true
      if (specificQuizId && showCompleted) {
        setQuizState('completed');
        return;
      }

      // Check if quiz is completed
      const userParticipation = (participationsData as any[] | undefined)?.find(
        (p: any) => p.userId === user.id && p.completedAt !== null
      );

      if (userParticipation) {
        setQuizState('completed');
        return;
      }

      // Check if quiz has been started (first question answered)
      if (questions.length > 0) {
        // We'll check this via the query or local state
        setHasStartedQuiz(false); // Will be updated when we check answers
      }

      setQuizState('intro');
    };

    determineQuizState();
  }, [quiz, user, isLoadingQuestions, participationsData, questions, specificQuizId, showCompleted, quizState]);

  // Refresh user data when leaving if quiz was completed
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (quizState === 'completed' && !specificQuizId) {
          refreshUser().catch(err => {
            console.error('Error refreshing user on page exit:', err);
          });
        }
      };
    }, [quizState, specificQuizId, refreshUser])
  );

  // ============ CALLBACKS ============

  const handleOpenExplanation = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleCloseExplanation = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleStartQuiz = async () => {
    if (!quiz || !user || questions.length === 0) return;

    // Start from beginning (could add resume logic here)
    setCurrentQuestionIndex(0);
    setSelectedAnswerId(null);
    setQuizState('question');
  };

  const handleSelectAnswer = (answerId: number) => {
    setSelectedAnswerId(answerId);
  };

  const handleValidate = async () => {
    if (!selectedAnswerId || !user || !questions[currentQuestionIndex] || !quiz) {
      Alert.alert('Attention', 'Veuillez sélectionner une réponse');
      return;
    }

    try {
      setIsSubmitting(true);
      const currentQuestion = questions[currentQuestionIndex];

      // Submit answer
      await submitAnswerMutation.mutateAsync({
        userId: user.id,
        questionId: currentQuestion.id,
        answerId: selectedAnswerId,
      });

      // Update local answers map
      const selectedAnswer = currentQuestion.answers.find(a => a.id === selectedAnswerId);
      setUserAnswers(prev => {
        const newMap = new Map(prev);
        newMap.set(currentQuestion.id, {
          answerId: selectedAnswerId,
          isCorrect: selectedAnswer?.isCorrect ?? false,
        });
        return newMap;
      });

      // Move to next question or complete
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswerId(null);
      } else {
        // Calculate final score from local state
        const allAnswers = [...userAnswers.values()];
        const currentAnswer = {
          answerId: selectedAnswerId,
          isCorrect: selectedAnswer?.isCorrect ?? false,
        };
        const finalAnswers = [...allAnswers, currentAnswer];
        const allCorrect = finalAnswers.every(a => a.isCorrect);

        // Complete the quiz
        console.log('[DailyQuiz] Creating/updating participation...');
        await completeQuizMutation.mutateAsync({
          quizId: quiz.id,
          isCorrect: allCorrect,
        });

        // Wait for backend to process streak update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refresh user data
        await refreshUser();
        console.log('[DailyQuiz] User refreshed, currentStreak should be updated');

        setQuizState('completed');
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      Alert.alert('Erreur', 'Impossible de soumettre la réponse');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ COMPUTED VALUES ============

  const isLoading = isLoadingQuiz || isLoadingQuestions;
  const shouldShowInitialLoader = (isLoading || quizState === null) && !quizError;

  // Calculate score for completion screen
  const totalQuestions = questions.length;
  const correctAnswers = Array.from(userAnswers.values()).filter(a => a.isCorrect).length;
  const score = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  const hasPassed = score >= 2 / 3;

  // Messages based on score
  const encouragementMessages = [
    'Ne vous découragez pas, continuez à apprendre !',
    'Chaque erreur est une opportunité d\'apprendre.',
    'Vous progressez à chaque quiz, continuez ainsi !',
  ];
  const congratulationMessages = [
    'Excellent travail ! Vous maîtrisez bien le sujet.',
    'Bravo !',
    'Félicitations ! Vous avez bien réussi ce quiz.',
    'Parfait ! Continuez sur cette lancée !',
  ];

  const messageArray = hasPassed ? congratulationMessages : encouragementMessages;
  const messageIndex = Math.floor(Math.random() * messageArray.length);
  const completedTitle = hasPassed ? 'Félicitations !' : 'Dommage';
  const completedEmoji = hasPassed ? '🎉' : '💪';
  const completedMessage = messageArray[messageIndex];

  // ============ RENDER ============

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {shouldShowInitialLoader ? (
          <View style={styles.centerContainer}>
            {!specificQuizId && (
              <>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text
                  style={[
                    styles.loadingText,
                    { fontFamily: CashouTheme.fonts.body, color: theme.text },
                  ]}
                >
                  Chargement du quiz...
                </Text>
              </>
            )}
          </View>
        ) : quizError ? (
          <View style={styles.centerContainer}>
            <Text
              style={[
                styles.errorText,
                { fontFamily: CashouTheme.fonts.body, color: theme.text },
              ]}
            >
              {specificQuizId ? 'Quiz introuvable' : 'Aucun quiz disponible pour aujourd\'hui'}
            </Text>
          </View>
        ) : quizState === 'intro' && quiz && !isLoading ? (
          <>
            <View style={styles.titleContainer}>
              <Text
                style={[
                  styles.title,
                  { fontFamily: CashouTheme.fonts.heading, color: theme.text },
                ]}
              >
                {quiz.title || 'Daily Quiz'}
              </Text>
            </View>
            <View style={styles.descriptionContainer}>
              <Text
                style={[
                  styles.description,
                  { fontFamily: CashouTheme.fonts.body, color: theme.text },
                ]}
              >
                {quiz.description || 'Testez vos connaissances avec le quiz du jour !'}
              </Text>
            </View>
          </>
        ) : quizState === 'question' && questions.length > 0 && !isLoading ? (
          <>
            <View style={styles.progressContainer}>
              <Text
                style={[
                  styles.progressText,
                  { fontFamily: CashouTheme.fonts.body, color: theme.text },
                ]}
              >
                Question {currentQuestionIndex + 1} / {questions.length}
              </Text>
            </View>
            <View style={styles.questionContainer}>
              <Text
                style={[
                  styles.questionText,
                  { fontFamily: CashouTheme.fonts.subheading, color: theme.text },
                ]}
              >
                {questions[currentQuestionIndex]?.text || 'Question'}
              </Text>
            </View>
            <View style={styles.answersContainer}>
              {questions[currentQuestionIndex]?.answers.map((answer) => (
                <TouchableOpacity
                  key={answer.id}
                  style={[
                    styles.answerButton,
                    {
                      backgroundColor: selectedAnswerId === answer.id ? theme.accent : theme.card,
                      borderColor: selectedAnswerId === answer.id ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => handleSelectAnswer(answer.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.answerText,
                      {
                        fontFamily: CashouTheme.fonts.body,
                        color: selectedAnswerId === answer.id ? '#1C1E33' : theme.text,
                      },
                    ]}
                  >
                    {answer.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : quizState === 'completed' ? (
          <View style={styles.completedContainer}>
            <Text style={styles.celebrationEmoji}>{completedEmoji}</Text>
            <Text
              style={[
                styles.completedTitle,
                { fontFamily: CashouTheme.fonts.heading, color: theme.text },
              ]}
            >
              {completedTitle}
            </Text>
            <Text
              style={[
                styles.completedScore,
                { fontFamily: CashouTheme.fonts.subheading, color: theme.text },
              ]}
            >
              Score : {correctAnswers} / {totalQuestions}
            </Text>
            <Text
              style={[
                styles.completedText,
                { fontFamily: CashouTheme.fonts.body, color: theme.text },
              ]}
            >
              {completedMessage}
            </Text>
          </View>
        ) : quizState === 'correction' && questions.length > 0 && !isLoading ? (
          <>
            <View style={styles.progressContainer}>
              <Text
                style={[
                  styles.progressText,
                  { fontFamily: CashouTheme.fonts.body, color: theme.text },
                ]}
              >
                Correction {correctionQuestionIndex + 1} / {questions.length}
              </Text>
            </View>
            <View style={styles.questionContainer}>
              <Text
                style={[
                  styles.questionText,
                  { fontFamily: CashouTheme.fonts.subheading, color: theme.text },
                ]}
              >
                {questions[correctionQuestionIndex]?.text || 'Question'}
              </Text>
            </View>
            <View style={styles.answersContainer}>
              {questions[correctionQuestionIndex]?.answers.map((answer) => {
                const userAnswer = userAnswers.get(questions[correctionQuestionIndex].id);
                const isUserAnswer = userAnswer?.answerId === answer.id;
                const isCorrect = answer.isCorrect === true;
                const isUserAnswerIncorrect = isUserAnswer && !isCorrect;
                const showAsCorrect = isCorrect;
                const showAsIncorrect = isUserAnswerIncorrect;
                const currentQuestion = questions[correctionQuestionIndex];
                const hasExplanation = currentQuestion?.explanation && currentQuestion.explanation.trim().length > 0;

                return (
                  <React.Fragment key={answer.id}>
                    <View
                      style={[
                        styles.answerButton,
                        {
                          backgroundColor: showAsCorrect
                            ? '#4CAF50'
                            : showAsIncorrect
                            ? '#F44336'
                            : theme.card,
                          borderColor: showAsCorrect
                            ? '#4CAF50'
                            : showAsIncorrect
                            ? '#F44336'
                            : theme.border,
                          borderWidth: 2,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.answerText,
                          {
                            fontFamily: CashouTheme.fonts.body,
                            color: showAsCorrect || showAsIncorrect ? '#FFFFFF' : theme.text,
                            flex: 1,
                          },
                        ]}
                      >
                        {answer.text}
                        {showAsCorrect && ' ✓'}
                        {showAsIncorrect && ' ✗'}
                      </Text>
                      {showAsCorrect && hasExplanation && (
                        <TouchableOpacity
                          onPress={handleOpenExplanation}
                          style={styles.infoButton}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.infoIcon}>ℹ️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Bottom buttons based on state */}
      {!isLoading && !quizError && quizState !== null && (
        <View style={[styles.buttonContainer, { backgroundColor: theme.background }]}>
          {quizState === 'intro' && quiz && (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: theme.accent }]}
              onPress={handleStartQuiz}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.startButtonText,
                  { fontFamily: CashouTheme.fonts.subheading, color: '#1C1E33' },
                ]}
              >
                {hasStartedQuiz ? 'Reprendre' : 'Commencer'}
              </Text>
            </TouchableOpacity>
          )}

          {quizState === 'question' && (
            <TouchableOpacity
              style={[
                styles.validateButton,
                {
                  backgroundColor: selectedAnswerId ? theme.accent : theme.border,
                  opacity: selectedAnswerId ? 1 : 0.5,
                },
              ]}
              onPress={handleValidate}
              activeOpacity={0.8}
              disabled={!selectedAnswerId || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#1C1E33" />
              ) : (
                <Text
                  style={[
                    styles.validateButtonText,
                    { fontFamily: CashouTheme.fonts.subheading, color: '#1C1E33' },
                  ]}
                >
                  Valider
                </Text>
              )}
            </TouchableOpacity>
          )}

          {quizState === 'completed' && (
            <>
              <TouchableOpacity
                style={[styles.correctionButton, { backgroundColor: theme.accent }]}
                onPress={() => {
                  setCorrectionQuestionIndex(0);
                  setQuizState('correction');
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.correctionButtonText,
                    { fontFamily: CashouTheme.fonts.subheading, color: '#1C1E33' },
                  ]}
                >
                  Correction
                </Text>
              </TouchableOpacity>

              <View style={styles.completedButtonsContainer}>
                <TouchableOpacity
                  style={[styles.completedButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
                  onPress={async () => {
                    try {
                      await refreshUser();
                    } catch (err) {
                      console.error('Error refreshing user:', err);
                    }
                    router.push('/(tabs)');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.completedButtonText,
                      { fontFamily: CashouTheme.fonts.subheading, color: theme.text },
                    ]}
                  >
                    Accueil
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.completedButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
                  onPress={() => {
                    router.push('/(tabs)/history');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.completedButtonText,
                      { fontFamily: CashouTheme.fonts.subheading, color: theme.text },
                    ]}
                  >
                    Historique
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {quizState === 'correction' && (
            <TouchableOpacity
              style={[styles.validateButton, { backgroundColor: theme.accent }]}
              onPress={() => {
                if (correctionQuestionIndex < questions.length - 1) {
                  setCorrectionQuestionIndex(correctionQuestionIndex + 1);
                  bottomSheetRef.current?.close();
                } else {
                  setQuizState('completed');
                  bottomSheetRef.current?.close();
                }
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.validateButtonText,
                  { fontFamily: CashouTheme.fonts.subheading, color: '#1C1E33' },
                ]}
              >
                {correctionQuestionIndex < questions.length - 1 ? 'Suivant' : 'Retour'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bottom Sheet for explanation */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.primary }}
        handleIndicatorStyle={{ backgroundColor: theme.border }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHeader}>
            <Text
              style={[
                styles.bottomSheetTitle,
                { fontFamily: CashouTheme.fonts.subheading, color: theme.text },
              ]}
            >
              Explication
            </Text>
            <TouchableOpacity
              onPress={handleCloseExplanation}
              style={styles.bottomSheetCloseButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.bottomSheetCloseText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.bottomSheetScrollView}
            contentContainerStyle={styles.bottomSheetScrollContent}
          >
            <Text
              style={[
                styles.bottomSheetText,
                { fontFamily: CashouTheme.fonts.body, color: theme.text },
              ]}
            >
              {questions[correctionQuestionIndex]?.explanation}
            </Text>
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
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
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  titleContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    opacity: 0.7,
  },
  questionContainer: {
    marginBottom: 32,
  },
  questionText: {
    fontSize: 24,
    lineHeight: 32,
  },
  answersContainer: {
    gap: 12,
  },
  answerButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
  },
  answerText: {
    fontSize: 16,
    lineHeight: 22,
  },
  validateButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  completedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  celebrationEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  completedTitle: {
    fontSize: 32,
    marginBottom: 16,
  },
  completedScore: {
    fontSize: 24,
    marginBottom: 16,
    fontWeight: '600',
  },
  completedText: {
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  correctionButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  correctionButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  completedButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  completedButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 18,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  bottomSheetCloseButton: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetCloseText: {
    fontSize: 24,
    fontWeight: '600',
  },
  bottomSheetScrollView: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    paddingBottom: 40,
  },
  bottomSheetText: {
    fontSize: 16,
    lineHeight: 24,
  },
});

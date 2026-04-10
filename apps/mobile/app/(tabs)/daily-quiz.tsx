import { View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAlert } from '@/hooks/use-alert';
import { useThemePreference } from '@/hooks/use-theme-provider';
import { Card, ActionPillButton } from '@/components/ui';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';

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

type QuizState = 'question' | 'completed' | 'correction';

export default function DailyQuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, refreshUser } = useAuth();
  const { colors, fonts, spacing } = useCashouTheme();
  const { showAlert } = useAlert();
  const { isDark } = useThemePreference();
  const insets = useSafeAreaInsets();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configure header for this screen
  useHeaderOptions({ showBackButton: true, onBackPress: () => router.back(), title: 'Quiz du jour' });

  // Récupérer les paramètres depuis la navigation
  // useLocalSearchParams peut retourner un tableau ou une chaîne
  const showCompletedParam = params?.showCompleted;
  const showCompleted = Array.isArray(showCompletedParam)
    ? showCompletedParam[0] === 'true'
    : showCompletedParam === 'true';

  // source permet de distinguer le contexte d'ouverture du screen
  const sourceParam = params?.source;
  const source = Array.isArray(sourceParam)
    ? sourceParam[0]
    : sourceParam;

  // Récupérer le quizId si fourni (pour les quiz depuis l'historique ou quiz de niveau)
  const quizIdParam = params?.quizId;
  const specificQuizId = Array.isArray(quizIdParam)
    ? quizIdParam[0]
    : quizIdParam;

  // gameInstanceId est fourni uniquement pour les quiz de niveau (depuis current.tsx)
  const gameInstanceIdParam = params?.gameInstanceId;
  const gameInstanceIdStr = Array.isArray(gameInstanceIdParam)
    ? gameInstanceIdParam[0]
    : gameInstanceIdParam;
  const gameInstanceId = gameInstanceIdStr ? parseInt(gameInstanceIdStr) : null;

  // Un quiz est un "quiz de niveau" si on a à la fois un quizId ET un gameInstanceId
  const isLevelQuiz = !!(specificQuizId && gameInstanceId && !isNaN(gameInstanceId));
  const shouldUseSpecificQuizId = source === 'history' || source === 'level_endgame' || isLevelQuiz;
  const resolvedQuizId = shouldUseSpecificQuizId ? specificQuizId : undefined;

  // Initialiser à null pour ne rien afficher tant que les données ne sont pas chargées
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // userQuizId : ID du UserQuiz créé par startLevelQuiz (quiz de niveau uniquement)
  const [levelUserQuizId, setLevelUserQuizId] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Map<number, { answerId: number; isCorrect: boolean }>>(new Map());
  const [correctionQuestionIndex, setCorrectionQuestionIndex] = useState(0);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%'], []);

  // Réinitialiser le bottom sheet quand on change de question
  useEffect(() => {
    if (quizState === 'correction') {
      bottomSheetRef.current?.close();
    }
  }, [correctionQuestionIndex, quizState]);

  // Callback pour ouvrir le bottom sheet
  const handleOpenExplanation = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  // Callback pour fermer le bottom sheet
  const handleCloseExplanation = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Backdrop personnalisé
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

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        // Toujours mettre isLoading à true au début pour masquer le contenu
        // Sauf si on vient de l'historique ET que showCompleted est true (on sait déjà ce qu'on veut afficher)
        if (!(resolvedQuizId && showCompleted)) {
          setIsLoading(true);
        }
        setError(null);
        // Réinitialiser tout l'état pour éviter d'afficher l'ancien quiz/correction
        setQuiz(null);
        setQuestions([]);
        setUserAnswers(new Map());
        setLevelUserQuizId(null);
        setCurrentQuestionIndex(0);
        setCorrectionQuestionIndex(0);
        setSelectedAnswerId(null);
        setQuizState(null);

        let quizData = null;

        // Si un quizId spécifique est fourni, charger ce quiz
        if (resolvedQuizId) {
          const quizId = parseInt(resolvedQuizId);
          if (!isNaN(quizId)) {
            quizData = await trpcClient.quiz.getById.query({ id: quizId });
          }
        } else {
          // Sinon, charger le quiz du jour
          quizData = await trpcClient.quiz.getTodaysDailyQuiz.query();
        }

        if (quizData && user) {
          setQuiz(quizData as Quiz);

          if (isLevelQuiz && gameInstanceId) {
            // === MODE QUIZ DE NIVEAU ===
            // Démarrer directement : crée un UserQuiz + tire 1 question aléatoire
            const result = await trpcClient.userQuiz.startLevelQuiz.mutate({
              quizId: (quizData as Quiz).id,
              gameInstanceId,
            });

            setLevelUserQuizId(result.userQuiz.id);
            setQuestions([result.question as Question]);
            setCurrentQuestionIndex(0);
            setSelectedAnswerId(null);
            setQuizState('question');
          } else {
            // === MODE QUIZ DAILY ===
            const questionsData = await trpcClient.quizQuestion.getQuestionsWithAnswers.query({
              quizId: (quizData as Quiz).id,
            });

            const formattedQuestions: Question[] = questionsData.map((qq: any) => ({
              id: qq.question.id,
              text: qq.question.text,
              explanation: qq.question.explanation,
              answers: qq.question.answers.map((a: any) => ({
                id: a.id,
                text: a.text,
                isCorrect: a.isCorrect,
              })),
            }));

            if (formattedQuestions.length === 0) {
              setError('Ce quiz n\'a pas de questions');
              setQuizState(null);
              return;
            }

            setQuestions(formattedQuestions);

            let isQuizCompleted = false;

            if (resolvedQuizId && showCompleted) {
              isQuizCompleted = true;
            } else {
              try {
                const allAnswers = await Promise.all(
                  formattedQuestions.map(async (q) => {
                    try {
                      const userAnswer = await trpcClient.userAnswer.getByUserAndQuestion.query({
                        userId: user.id,
                        questionId: q.id,
                      });
                      return userAnswer !== null;
                    } catch {
                      return false;
                    }
                  })
                );

                const allAnswered = allAnswers.every((answered) => answered);

                if (allAnswered) {
                  const participations = await trpcClient.userQuiz.getByQuiz.query({
                    quizId: (quizData as Quiz).id,
                  });

                  const userParticipation = (participations as any[]).find(
                    (p: any) => p.userId === user.id && p.completedAt !== null
                  );

                  isQuizCompleted = userParticipation !== undefined;
                }
              } catch (err) {
                console.error('Error checking quiz completion:', err);
              }
            }

            const answersPromises = formattedQuestions.map(async (q) => {
              try {
                const userAnswer = await trpcClient.userAnswer.getByUserAndQuestion.query({
                  userId: user.id,
                  questionId: q.id,
                });
                if (userAnswer) {
                  return {
                    questionId: q.id,
                    answerId: (userAnswer as any).answerId,
                    isCorrect: (userAnswer as any).accurate || false,
                  };
                }
              } catch {
                // Ignorer les erreurs
              }
              return null;
            });

            const answersResults = await Promise.all(answersPromises);
            const answersMap = new Map<number, { answerId: number; isCorrect: boolean }>();
            answersResults.forEach((result) => {
              if (result) {
                answersMap.set(result.questionId, {
                  answerId: result.answerId,
                  isCorrect: result.isCorrect,
                });
              }
            });
            setUserAnswers(answersMap);

            if (isQuizCompleted) {
              setQuizState('completed');
            } else {
              // Trouver la première question non répondue et aller directement dessus
              const answeredQuestions = await Promise.all(
                formattedQuestions.map(async (q) => {
                  try {
                    const userAnswer = await trpcClient.userAnswer.getByUserAndQuestion.query({
                      userId: user.id,
                      questionId: q.id,
                    });
                    return userAnswer ? q.id : null;
                  } catch {
                    return null;
                  }
                })
              );

              const firstUnansweredIndex = answeredQuestions.findIndex((answeredId) => answeredId === null);

              if (firstUnansweredIndex === -1) {
                // Toutes répondues mais pas marqué comme complété
                setCurrentQuestionIndex(formattedQuestions.length - 1);
              } else {
                setCurrentQuestionIndex(firstUnansweredIndex);
              }
              setSelectedAnswerId(null);
              setQuizState('question');
            }
          }
        } else if (quizData) {
          setQuiz(quizData as Quiz);
          setError('Connectez-vous pour accéder au quiz');
          setQuizState(null);
        } else {
          // Aucun quiz trouvé
          setError(specificQuizId ? 'Quiz introuvable' : 'Aucun quiz disponible pour aujourd\'hui');
          setQuizState(null);
        }
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setError(specificQuizId ? 'Impossible de charger le quiz' : 'Impossible de charger le quiz du jour');
        setQuizState(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showCompleted, resolvedQuizId, source, gameInstanceId, isLevelQuiz]); // Ne pas inclure quizState dans les dépendances pour éviter les rechargements

  // Rafraîchir les données utilisateur quand on quitte la page (si le quiz est complété)
  // Cela permet de mettre à jour le currentStreak et le statut du quiz sur la page d'accueil
  useFocusEffect(
    React.useCallback(() => {
      // Cleanup : rafraîchir quand on quitte la page si le quiz était complété
      return () => {
        if (quizState === 'completed' && !specificQuizId) {
          // C'est le quiz du jour qui est complété, rafraîchir les données
          refreshUser().catch(err => {
            console.error('Error refreshing user on page exit:', err);
          });
        }
      };
    }, [quizState, specificQuizId, refreshUser])
  );

  const handleSelectAnswer = (answerId: number) => {
    setSelectedAnswerId(answerId);
  };

  const handleValidate = async () => {
    if (!selectedAnswerId || !user || !questions[currentQuestionIndex] || !quiz) {
      showAlert('Attention', 'Veuillez sélectionner une réponse');
      return;
    }

    try {
      setIsSubmitting(true);
      const currentQuestion = questions[currentQuestionIndex];

      if (isLevelQuiz && levelUserQuizId) {
        // === MODE QUIZ DE NIVEAU ===
        // Une seule question : on soumet directement via submitLevelQuizAnswer
        // Le backend enregistre la UserAnswer, finalise le UserQuiz et met à jour l'étoile quiz
        const result = await trpcClient.userQuiz.submitLevelQuizAnswer.mutate({
          userQuizId: levelUserQuizId,
          questionId: currentQuestion.id,
          answerId: selectedAnswerId,
        });

        // Stocker la réponse pour l'affichage de correction
        const answersMap = new Map<number, { answerId: number; isCorrect: boolean }>();
        answersMap.set(currentQuestion.id, {
          answerId: selectedAnswerId,
          isCorrect: result.isCorrect,
        });
        setUserAnswers(answersMap);
        setQuizState('completed');
      } else {
        // === MODE QUIZ DAILY (comportement existant) ===
        let alreadyAnswered = false;
        try {
          const existingAnswer = await trpcClient.userAnswer.getByUserAndQuestion.query({
            userId: user.id,
            questionId: currentQuestion.id,
          });
          alreadyAnswered = existingAnswer !== null;
        } catch {
          // Si erreur, on considère que ce n'est pas encore répondu
        }

        if (alreadyAnswered) {
          console.log('Question déjà répondue, passage à la suivante');
        } else {
          await trpcClient.userAnswer.submitAnswer.mutate({
            userId: user.id,
            questionId: currentQuestion.id,
            answerId: selectedAnswerId,
          });
        }

        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswerId(null);
        } else {
          const allAnswers = await Promise.all(
            questions.map(async (q) => {
              try {
                const userAnswer = await trpcClient.userAnswer.getByUserAndQuestion.query({
                  userId: user.id,
                  questionId: q.id,
                });
                return (userAnswer as any)?.accurate || false;
              } catch {
                return false;
              }
            })
          );

          const allCorrect = allAnswers.every((correct) => correct);

          const answersMap = new Map<number, { answerId: number; isCorrect: boolean }>();
          for (const q of questions) {
            try {
              const userAnswer = await trpcClient.userAnswer.getByUserAndQuestion.query({
                userId: user.id,
                questionId: q.id,
              });
              if (userAnswer) {
                answersMap.set(q.id, {
                  answerId: (userAnswer as any).answerId,
                  isCorrect: (userAnswer as any).accurate || false,
                });
              }
            } catch {
              // Ignorer les erreurs
            }
          }
          setUserAnswers(answersMap);

          try {
            await trpcClient.userQuiz.createOrUpdateParticipation.mutate({
              quizId: quiz.id,
              isCorrect: allCorrect,
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
            await refreshUser();
          } catch (err) {
            console.error('[DailyQuiz] Error completing quiz:', err);
          }

          setQuizState('completed');
        }
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      showAlert('Erreur', 'Impossible de soumettre la réponse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shouldShowInitialLoader = (isLoading || quizState === null) && !error;

  // Calculer le score pour l'affichage de fin de quiz
  const totalQuestions = questions.length;
  const correctAnswers = Array.from(userAnswers.values()).filter(
    (answer) => answer.isCorrect
  ).length;
  const score = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  // Pour le quiz de niveau : réussi si la 1 question est correcte (score === 1)
  // Pour le daily quiz : réussi si >= 2/3
  const hasPassed = isLevelQuiz ? score === 1 : score >= 2 / 3;

  // Messages selon le score
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

  // Sélectionner un message aléatoire une seule fois quand le quiz est complété
  const [completedMessage, setCompletedMessage] = useState('');
  const completedTitle = hasPassed ? 'Félicitations !' : 'Dommage';
  const completedEmoji = hasPassed ? '🎉' : '💪';

  useEffect(() => {
    if (quizState === 'completed') {
      const messageArray = hasPassed ? congratulationMessages : encouragementMessages;
      setCompletedMessage(messageArray[Math.floor(Math.random() * messageArray.length)]);
    }
  }, [quizState === 'completed']);

  // Espace en bas (tab bar cachée pendant question/correction)
  const bottomSafeArea = insets.bottom + 80;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSafeArea, flexGrow: 1 }]}>
        {shouldShowInitialLoader ? (
          <View style={styles.centerContainer}>
            {!specificQuizId && (
              <>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{ marginTop: 16, fontSize: 16, fontFamily: fonts.body, color: colors.text }}>
                  Chargement du quiz...
                </Text>
              </>
            )}
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={{ fontSize: 16, fontFamily: fonts.body, color: colors.text, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        ) : quizState === 'question' && questions.length > 0 && !isLoading ? (
          <>
            {/* Progression */}
            <Text allowFontScaling={false} style={[styles.progressLabel, { color: colors.text }]}>
              Question {currentQuestionIndex + 1} / {questions.length}
            </Text>

            {/* Barre de progression */}
            <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  },
                ]}
              />
            </View>

            {/* Question dans une Card */}
            <Card variant="default" padding="lg" style={{ marginBottom: spacing.lg }}>
              <Text allowFontScaling={false} style={{ fontSize: 18, fontFamily: fonts.body, color: colors.text, lineHeight: 26 }}>
                {questions[currentQuestionIndex]?.text || 'Question'}
              </Text>
            </Card>

            {/* Réponses centrées entre question et bouton */}
            <View style={{ flex: 1, justifyContent: 'center' }} />
            <View style={{ gap: 10 }}>
              {questions[currentQuestionIndex]?.answers.map((answer) => {
                const isSelected = selectedAnswerId === answer.id;
                return (
                  <TouchableOpacity key={answer.id} onPress={() => handleSelectAnswer(answer.id)} activeOpacity={0.85}>
                    <View
                      style={[
                        styles.answerRow,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.card,
                        },
                      ]}
                    >
                      {/* Indicateur rond */}
                      <View
                        style={[
                          styles.answerDot,
                          {
                            borderColor: isSelected ? '#6B7280' : colors.borderLight,
                            backgroundColor: isSelected ? '#6B7280' : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <View style={styles.answerDotInner} />}
                      </View>
                      <Text
                        allowFontScaling={false}
                        style={{
                          fontSize: 16,
                          fontFamily: fonts.body,
                          color: isSelected ? '#1C1E33' : colors.text,
                          lineHeight: 22,
                          flex: 1,
                        }}
                      >
                        {answer.text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flex: 1 }} />
          </>
        ) : quizState === 'correction' && questions.length > 0 && !isLoading ? (
          <>
            {/* Progression */}
            <Text allowFontScaling={false} style={[styles.progressLabel, { color: colors.text }]}>
              Correction {correctionQuestionIndex + 1} / {questions.length}
            </Text>

            <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${((correctionQuestionIndex + 1) / questions.length) * 100}%`,
                  },
                ]}
              />
            </View>

            {/* Question */}
            <Card variant="default" padding="lg" style={{ marginBottom: spacing.lg }}>
              <Text allowFontScaling={false} style={{ fontSize: 18, fontFamily: fonts.body, color: colors.text, lineHeight: 26 }}>
                {questions[correctionQuestionIndex]?.text || 'Question'}
              </Text>
            </Card>

            {/* Réponses avec correction */}
            <View style={{ gap: 10 }}>
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
                  <View
                    key={answer.id}
                    style={[
                      styles.answerRow,
                      {
                        backgroundColor: showAsCorrect ? '#88D498' : showAsIncorrect ? '#E8889A' : colors.card,
                      },
                    ]}
                  >
                    {/* Icone status */}
                    <View style={[styles.correctionIcon, { backgroundColor: showAsCorrect ? '#4CAF50' : showAsIncorrect ? '#D47085' : 'transparent' }]}>
                      {showAsCorrect && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      {showAsIncorrect && <Ionicons name="close" size={14} color="#FFFFFF" />}
                    </View>
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontSize: 16,
                        fontFamily: fonts.body,
                        color: showAsCorrect || showAsIncorrect ? '#FFFFFF' : colors.text,
                        lineHeight: 22,
                        flex: 1,
                      }}
                    >
                      {answer.text}
                    </Text>
                    {showAsCorrect && hasExplanation && (
                      <TouchableOpacity onPress={handleOpenExplanation} style={styles.infoButton} activeOpacity={0.7}>
                        <Ionicons name="information-circle-outline" size={22} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Modale de résultat (style endGame) */}
      <Modal
        visible={quizState === 'completed'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (isLevelQuiz && gameInstanceId) {
            router.push({ pathname: '/(tabs)/summary', params: { gameId: gameInstanceId.toString() } });
          } else {
            router.replace('/(tabs)/');
          }
        }}
      >
        <BlurView
          intensity={60}
          tint={isDark ? 'dark' : 'light'}
          style={styles.modalBlur}
        >
          <Pressable style={styles.modalOverlay} onPress={() => {
            if (isLevelQuiz && gameInstanceId) {
              router.push({ pathname: '/(tabs)/summary', params: { gameId: gameInstanceId.toString() } });
            } else {
              router.replace('/(tabs)/');
            }
          }}>
            <Pressable onPress={(e) => e.stopPropagation()} style={[styles.modalCardBackdrop, { backgroundColor: colors.secondary }]}>
              <View style={[styles.modalCard, { backgroundColor: colors.card, shadowColor: colors.border }]}>
                <Text style={{ fontSize: 64, textAlign: 'center', marginBottom: 8 }}>{completedEmoji}</Text>

                <Text allowFontScaling={false} style={[styles.modalTitle, { color: colors.text }]}>
                  {completedTitle}
                </Text>

                <Text
                  allowFontScaling={false}
                  style={{
                    fontSize: 15,
                    fontFamily: 'Anybody',
                    color: colors.text,
                    textAlign: 'center',
                    lineHeight: 20,
                  }}
                >
                  {completedMessage}
                </Text>

                {/* Score pill */}
                <View style={[styles.scorePill, { backgroundColor: hasPassed ? '#88D498' : '#E8889A' }]}>
                  <Text allowFontScaling={false} style={styles.scorePillText}>
                    {correctAnswers} / {totalQuestions}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <ActionPillButton
                    label="Correction"
                    iconName="eye-outline"
                    onPress={() => {
                      setCorrectionQuestionIndex(0);
                      setQuizState('correction');
                    }}
                  />
                  {isLevelQuiz ? (
                    <ActionPillButton
                      label="Recap"
                      iconName="document-text-outline"
                      onPress={() => {
                        router.push({ pathname: '/(tabs)/summary', params: { gameId: gameInstanceId!.toString() } });
                      }}
                    />
                  ) : (
                    <ActionPillButton
                      label="Historique"
                      iconName="time-outline"
                      onPress={() => router.push('/(tabs)/history')}
                    />
                  )}
                </View>
              </View>
            </Pressable>
          </Pressable>
        </BlurView>
      </Modal>

      {/* Boutons flottants pour question et correction - style ActionPillButton */}
      {!isLoading && !error && (quizState === 'question' || quizState === 'correction') && (
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          {quizState === 'question' && (
            <ActionPillButton
              label="Valider"
              iconName="checkmark-circle-outline"
              onPress={handleValidate}
              disabled={!selectedAnswerId || isSubmitting}
              isLoading={isSubmitting}
              style={{ alignSelf: 'center', paddingHorizontal: 20 }}
            />
          )}

          {quizState === 'correction' && (
            <>
              {correctionQuestionIndex > 0 && (
                <ActionPillButton
                  label="Précédent"
                  iconName="arrow-back"
                  onPress={() => {
                    setCorrectionQuestionIndex(correctionQuestionIndex - 1);
                    bottomSheetRef.current?.close();
                  }}
                  style={{ alignSelf: 'center', paddingHorizontal: 20 }}
                />
              )}
              <ActionPillButton
                label={correctionQuestionIndex < questions.length - 1 ? 'Suivant' : (isLevelQuiz ? 'Recap' : 'Accueil')}
                iconName={correctionQuestionIndex < questions.length - 1 ? 'arrow-forward' : (isLevelQuiz ? 'document-text-outline' : 'home-outline')}
                onPress={() => {
                  if (correctionQuestionIndex < questions.length - 1) {
                    setCorrectionQuestionIndex(correctionQuestionIndex + 1);
                    bottomSheetRef.current?.close();
                  } else {
                    bottomSheetRef.current?.close();
                    if (isLevelQuiz && gameInstanceId) {
                      router.push({ pathname: '/(tabs)/summary', params: { gameId: gameInstanceId.toString() } });
                    } else {
                      router.push('/(tabs)/');
                    }
                  }
                }}
                style={{ alignSelf: 'center', paddingHorizontal: 20 }}
              />
            </>
          )}
        </View>
      )}

      {/* Bottom Sheet pour l'explication */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.borderLight }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHeader}>
            <Text allowFontScaling={false} style={[styles.screenTitle, { color: colors.text, fontSize: 20 }]}>
              Explication
            </Text>
          </View>

          <ScrollView style={styles.bottomSheetScrollView} contentContainerStyle={styles.bottomSheetScrollContent}>
            <Text allowFontScaling={false} style={{ fontSize: 16, fontFamily: 'Roboto', color: colors.text, lineHeight: 24 }}>
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
    paddingTop: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: 'Anybody',
    fontWeight: '700',
  },
  // Progress
  progressLabel: {
    fontSize: 14,
    fontFamily: 'Roboto',
    opacity: 0.6,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Answer rows (like game-history level rows)
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 12,
  },
  answerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  // Correction icons
  correctionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal (style endGame)
  modalBlur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalCardBackdrop: {
    width: '97%',
    maxWidth: 410,
    borderRadius: 36,
    padding: 6,
  },
  modalCard: {
    width: '100%',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontFamily: 'Anybody',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  scorePill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 80,
    marginTop: 14,
    marginBottom: 14,
  },
  scorePillText: {
    fontSize: 20,
    fontFamily: 'Roboto',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  // Bottom floating actions (like summary)
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
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  // Bottom sheet
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
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  bottomSheetCloseButton: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetScrollView: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    paddingBottom: 40,
  },
});

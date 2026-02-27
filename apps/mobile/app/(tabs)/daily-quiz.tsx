import { View, Text, useColorScheme as useRNColorScheme, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
// import { CashouHeader } from '@/components/cashou-header';
import { CashouTheme } from '@/constants/cashou-theme';
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

type QuizState = 'intro' | 'question' | 'completed' | 'correction';

export default function DailyQuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, refreshUser } = useAuth();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configure header for this screen
  useHeaderOptions({ showBackButton: true, onBackPress: () => router.back() });

  // Récupérer les paramètres depuis la navigation
  // useLocalSearchParams peut retourner un tableau ou une chaîne
  const showCompletedParam = params?.showCompleted;
  const showCompleted = Array.isArray(showCompletedParam)
    ? showCompletedParam[0] === 'true'
    : showCompletedParam === 'true';

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

  // Initialiser à null pour ne rien afficher tant que les données ne sont pas chargées
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // userQuizId : ID du UserQuiz créé par startLevelQuiz (quiz de niveau uniquement)
  const [levelUserQuizId, setLevelUserQuizId] = useState<number | null>(null);
  const [hasStartedQuiz, setHasStartedQuiz] = useState(false);
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
      // Ne pas recharger si on est déjà en mode correction
      // Cela évite de réinitialiser l'état quand on navigue dans la correction
      if (quizState === 'correction') {
        return;
      }

      try {
        // Toujours mettre isLoading à true au début pour masquer le contenu
        // Sauf si on vient de l'historique ET que showCompleted est true (on sait déjà ce qu'on veut afficher)
        if (!(specificQuizId && showCompleted)) {
          setIsLoading(true);
        }
        setError(null);
        // Réinitialiser l'état pour éviter d'afficher l'ancien état
        setQuizState(null);

        let quizData = null;

        // Si un quizId spécifique est fourni, charger ce quiz
        if (specificQuizId) {
          const quizId = parseInt(specificQuizId);
          if (!isNaN(quizId)) {
            quizData = await trpcClient.quiz.getById.query({ id: quizId });
          }
        } else {
          // Sinon, charger le quiz du jour
          quizData = await trpcClient.quiz.getTodaysDailyQuiz.query();
        }

        if (quizData && user) {
          setQuiz(quizData as Quiz);

          if (isLevelQuiz) {
            // === MODE QUIZ DE NIVEAU ===
            // On ne charge pas les questions ici : elles seront tirées aléatoirement
            // au moment où l'utilisateur clique sur "Commencer" (handleStartQuiz).
            // On affiche directement l'écran d'intro.
            setHasStartedQuiz(false);
            setQuizState('intro');
          } else {
            // === MODE QUIZ DAILY (comportement existant) ===
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

            setQuestions(formattedQuestions);

            let isQuizCompleted = false;

            if (specificQuizId && showCompleted) {
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
              const firstQuestionId = formattedQuestions[0]?.id;
              if (firstQuestionId) {
                try {
                  const userAnswer = await trpcClient.userAnswer.getByUserAndQuestion.query({
                    userId: user.id,
                    questionId: firstQuestionId,
                  });
                  setHasStartedQuiz(userAnswer !== null);
                } catch {
                  setHasStartedQuiz(false);
                }
              }
              setQuizState('intro');
            }
          }
        } else if (quizData) {
          // Quiz chargé mais pas d'utilisateur
          setQuiz(quizData as Quiz);
          setQuizState('intro');
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
  }, [user, showCompleted, specificQuizId]); // Ne pas inclure quizState dans les dépendances pour éviter les rechargements

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

  const handleStartQuiz = async () => {
    if (!quiz || !user) return;

    try {
      setIsLoading(true);

      if (isLevelQuiz && gameInstanceId) {
        // === MODE QUIZ DE NIVEAU ===
        // Appel backend : crée un UserQuiz lié à la gameInstance + tire 1 question aléatoire
        const result = await trpcClient.userQuiz.startLevelQuiz.mutate({
          quizId: quiz.id,
          gameInstanceId,
        });

        setLevelUserQuizId(result.userQuiz.id);
        setQuestions([result.question as Question]);
        setCurrentQuestionIndex(0);
        setSelectedAnswerId(null);
        setQuizState('question');
      } else {
        // === MODE QUIZ DAILY (comportement existant) ===
        const questionsData = await trpcClient.quizQuestion.getQuestionsWithAnswers.query({
          quizId: quiz.id,
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
          Alert.alert('Erreur', 'Ce quiz n\'a pas de questions');
          return;
        }

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
          const existingParticipations = await trpcClient.userQuiz.getByQuiz.query({
            quizId: quiz.id,
          });

          const userParticipation = (existingParticipations as any[]).find(
            (p: any) => p.userId === user.id && p.completedAt !== null
          );

          if (userParticipation) {
            setQuestions(formattedQuestions);
            setCurrentQuestionIndex(0);
            setQuizState('completed');
          } else {
            setQuestions(formattedQuestions);
            setCurrentQuestionIndex(formattedQuestions.length - 1);
            setQuizState('question');
          }
        } else {
          setQuestions(formattedQuestions);
          setCurrentQuestionIndex(firstUnansweredIndex);
          setSelectedAnswerId(null);
          setQuizState('question');
        }
      }
    } catch (err) {
      console.error('Error starting quiz:', err);
      Alert.alert('Erreur', 'Impossible de démarrer le quiz');
    } finally {
      setIsLoading(false);
    }
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
      Alert.alert('Erreur', 'Impossible de soumettre la réponse');
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

  // Sélectionner un message aléatoire dans la liste appropriée
  const messageArray = hasPassed ? congratulationMessages : encouragementMessages;
  const messageIndex = Math.floor(Math.random() * messageArray.length);
  const completedTitle = hasPassed ? 'Félicitations !' : 'Dommage';
  const completedEmoji = hasPassed ? '🎉' : '💪';
  const completedMessage = messageArray[messageIndex];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {shouldShowInitialLoader ? (
          // Ne rien afficher pendant le chargement pour éviter le clignotement
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
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text
              style={[
                styles.errorText,
                { fontFamily: CashouTheme.fonts.body, color: theme.text },
              ]}
            >
              {error}
            </Text>
          </View>
        ) : quizState === 'intro' && quiz && !isLoading ? (
          <>
            {/* Titre du Quiz */}
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

            {/* Description */}
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
            {/* Indicateur de progression */}
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

            {/* Question actuelle */}
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

            {/* Réponses */}
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
            {/* Indicateur de progression */}
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

            {/* Question actuelle */}
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

            {/* Réponses avec correction */}
            <View style={styles.answersContainer}>
              {questions[correctionQuestionIndex]?.answers.map((answer, index) => {
                const userAnswer = userAnswers.get(questions[correctionQuestionIndex].id);
                const isUserAnswer = userAnswer?.answerId === answer.id;
                const isCorrect = answer.isCorrect === true;
                // const isUserAnswerCorrect = isUserAnswer && isCorrect;
                const isUserAnswerIncorrect = isUserAnswer && !isCorrect;
                const showAsCorrect = isCorrect; // Toujours montrer la bonne réponse en vert
                const showAsIncorrect = isUserAnswerIncorrect; // La réponse de l'utilisateur si elle est fausse
                const currentQuestion = questions[correctionQuestionIndex];
                const hasExplanation = currentQuestion?.explanation && currentQuestion.explanation.trim().length > 0;
                // const isCorrectAnswer = showAsCorrect;

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

      {/* Boutons en bas selon l'état */}
      {!isLoading && !error && quizState !== null && (
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
              {/* Bouton Correction centré */}
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

              {/* Boutons Accueil et Historique */}
              <View style={styles.completedButtonsContainer}>
                     <TouchableOpacity
                       style={[styles.completedButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
                       onPress={async () => {
                         // Rafraîchir les données avant de naviguer
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
                    if (isLevelQuiz && gameInstanceId) {
                      router.push({
                        pathname: '/(tabs)/summary',
                        params: { gameId: gameInstanceId.toString() },
                      });
                    } else {
                      router.push('/(tabs)/history');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.completedButtonText,
                      { fontFamily: CashouTheme.fonts.subheading, color: theme.text },
                    ]}
                  >
                    {isLevelQuiz ? 'Recap' : 'Historique'}
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

      {/* Bottom Sheet pour l'explication */}
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
          {/* Header */}
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

          {/* Contenu */}
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
    paddingBottom: 120, // Espace pour le bouton en bas (augmenté)
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
  explanationContainer: {
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  explanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  explanationTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 24,
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

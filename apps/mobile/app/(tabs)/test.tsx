import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useColorScheme as useRNColorScheme,
  StyleSheet,
} from 'react-native';
import { CashouTheme } from '@/constants/cashou-theme';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';

interface Answer {
  id: number;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: number;
  text: string;
  answers: Answer[];
}

interface Quiz {
  id: number;
  title: string;
  description: string | null;
  type: string;
}

export default function TestScreen() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const { user } = useAuth();

  // Configure header for this screen
  useHeaderOptions({ showBackButton: false });

  // Form state
  const [quizId, setQuizId] = useState('');
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ questionId: number; answerId: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleStartQuiz = async () => {
    if (!quizId.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un ID de quiz');
      return;
    }

    const quizIdNum = parseInt(quizId);
    if (isNaN(quizIdNum) || quizIdNum <= 0) {
      Alert.alert('Erreur', 'L\'ID du quiz doit être un nombre valide');
      return;
    }

    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour faire un quiz');
      return;
    }

    setIsLoadingQuiz(true);
    try {
      // Fetch quiz details
      const quizData = await trpcClient.quiz.getById.query({ id: quizIdNum });
      setQuiz(quizData as Quiz);

      // Fetch questions with answers
      const questionsData = await trpcClient.quizQuestion.getQuestionsWithAnswers.query({
        quizId: quizIdNum,
      });

      // Transform the data structure
      const formattedQuestions: Question[] = questionsData.map((qq: any) => ({
        id: qq.question.id,
        text: qq.question.text,
        answers: qq.question.answers.map((a: any) => ({
          id: a.id,
          text: a.text,
          isCorrect: a.isCorrect,
        })),
      }));

      // Limit to 3 questions
      setQuestions(formattedQuestions.slice(0, 3));
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setSelectedAnswerId(null);
      setHasAnswered(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('Erreur', 'Impossible de charger le quiz');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleSelectAnswer = (answerId: number) => {
    setSelectedAnswerId(answerId);
  };

  const handleNext = async () => {
    if (!selectedAnswerId) {
      Alert.alert('Attention', 'Veuillez sélectionner une réponse');
      return;
    }

    if (!user || !currentQuestion) return;

    // If already answered, move to next question
    if (hasAnswered) {
      if (isLastQuestion) {
        handleFinishQuiz();
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswerId(null);
        setHasAnswered(false);
      }
      return;
    }

    // Save the answer
    const newAnswer = {
      questionId: currentQuestion.id,
      answerId: selectedAnswerId,
    };
    setUserAnswers([...userAnswers, newAnswer]);

    // Submit answer to backend
    setIsSubmitting(true);
    try {
      await trpcClient.userAnswer.submitAnswer.mutate({
        userId: user.id,
        questionId: currentQuestion.id,
        answerId: selectedAnswerId,
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
      setHasAnswered(true);
    }
  };

  const handleFinishQuiz = () => {
    Alert.alert(
      'Quiz terminé !',
      `Vous avez répondu à ${userAnswers.length + 1} questions.`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Reset to form
            setQuiz(null);
            setQuestions([]);
            setCurrentQuestionIndex(0);
            setUserAnswers([]);
            setSelectedAnswerId(null);
            setHasAnswered(false);
            setQuizId('');
          },
        },
      ]
    );
  };

  // Show quiz screen if quiz is loaded
  if (quiz && questions.length > 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Quiz Header */}
          <View style={styles.quizHeader}>
            <Text style={[styles.quizTitle, { fontFamily: CashouTheme.fonts.heading, color: theme.text }]}>
              {quiz.title}
            </Text>
            <Text style={[styles.questionCounter, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
              Question {currentQuestionIndex + 1} / {questions.length}
            </Text>
          </View>

          {/* Question Card */}
          <View style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.questionLabel, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
              Introduction
            </Text>
            <Text style={[styles.questionText, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
              {currentQuestion?.text}
            </Text>

            <Text style={[styles.questionLabel, { fontFamily: CashouTheme.fonts.body, color: theme.text, marginTop: 24 }]}>
              Question
            </Text>
            <Text style={[styles.questionText, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
              Quelle est la bonne réponse ?
            </Text>

            {/* Answer Options */}
            <View style={styles.answersContainer}>
              {currentQuestion?.answers.map((answer) => {
                const isSelected = selectedAnswerId === answer.id;
                const isCorrect = answer.isCorrect;
                const showCorrect = hasAnswered && isCorrect;

                let backgroundColor = theme.card;
                let borderColor = theme.border;

                if (showCorrect) {
                  borderColor = '#22C55E';
                } else if (isSelected) {
                  backgroundColor = theme.accent;
                  borderColor = theme.accent;
                }

                return (
                  <TouchableOpacity
                    key={answer.id}
                    style={[
                      styles.answerButton,
                      {
                        backgroundColor,
                        borderColor,
                      },
                    ]}
                    onPress={() => handleSelectAnswer(answer.id)}
                    disabled={isSubmitting || hasAnswered}
                  >
                    <Text
                      style={[
                        styles.answerText,
                        {
                          fontFamily: CashouTheme.fonts.body,
                          color: isSelected && !hasAnswered ? '#1C1E33' : theme.text,
                        },
                      ]}
                    >
                      {answer.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Next/Finish Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.accent,
                opacity: selectedAnswerId && !isSubmitting ? 1 : 0.5,
              },
            ]}
            onPress={handleNext}
            disabled={!selectedAnswerId || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#1C1E33" />
            ) : (
              <Text style={[styles.actionButtonText, { fontFamily: CashouTheme.fonts.subheading }]}>
                {isLastQuestion ? 'Valider' : 'Suivant'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Show form to enter quiz ID
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { fontFamily: CashouTheme.fonts.heading, color: theme.text }]}>
            Test de Quiz
          </Text>
          <Text style={[styles.formSubtitle, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
            Entrez l&apos;ID du quiz que vous souhaitez tester
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
              ID du Quiz
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: CashouTheme.fonts.body,
                },
              ]}
              placeholder="Entrez l'ID du quiz"
              placeholderTextColor={isDark ? '#9BA1A6' : '#687076'}
              value={quizId}
              onChangeText={setQuizId}
              keyboardType="numeric"
              editable={!isLoadingQuiz}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.accent }]}
            onPress={handleStartQuiz}
            disabled={isLoadingQuiz}
          >
            {isLoadingQuiz ? (
              <ActivityIndicator color="#1C1E33" />
            ) : (
              <Text style={[styles.submitButtonText, { fontFamily: CashouTheme.fonts.subheading }]}>
                Faire le quiz
              </Text>
            )}
          </TouchableOpacity>
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
    paddingBottom: 32,
  },
  formContainer: {
    padding: 24,
  },
  formTitle: {
    fontSize: 32,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    marginBottom: 32,
    opacity: 0.7,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    color: '#1C1E33',
  },
  quizHeader: {
    padding: 24,
    paddingBottom: 16,
  },
  quizTitle: {
    fontSize: 28,
    marginBottom: 8,
  },
  questionCounter: {
    fontSize: 16,
    opacity: 0.7,
  },
  questionCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  questionLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  answersContainer: {
    marginTop: 24,
    gap: 12,
  },
  answerButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 60,
    justifyContent: 'center',
  },
  answerText: {
    fontSize: 16,
    lineHeight: 22,
  },
  actionButton: {
    marginHorizontal: 16,
    marginTop: 24,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 18,
    color: '#1C1E33',
  },
});

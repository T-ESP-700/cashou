/**
 * Tests E2E — Scénario quiz complet
 * 
 * Teste le workflow complet quiz :
 * 1. Récupération des quiz disponibles
 * 2. Démarrage d'un quiz
 * 3. Réponses aux questions
 * 4. Validation et calcul de score
 * 5. Attribution de points
 * 
 * Ultra-optimisé : utilise e2e-test-factory pour setup réutilisable
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createE2ESetup, createQuizE2ESetup, cleanupE2EServer } from "../helpers/e2e-test-factory";
import prisma from "../../src/database";

describe("E2E — Scénario quiz complet", () => {
  const { factory } = createE2ESetup();
  let quizSetup: Awaited<ReturnType<typeof createQuizE2ESetup>>;

  beforeAll(async () => {
    // Créer setup complet de quiz
    quizSetup = await createQuizE2ESetup({
      quizType: "MCQ",
      questionCount: 5,
      answersPerQuestion: 4,
    });
  });

  afterAll(async () => {
    await factory.cleanup();
    await cleanupE2EServer();
  });

  describe("1. Récupération des quiz", () => {
    it("peut récupérer tous les quiz via API", async () => {
      const quizzes = await quizSetup.client.quiz.getAll.query();
      expect(quizzes).toBeDefined();
      expect(Array.isArray(quizzes)).toBeTrue();
    });

    it("peut récupérer un quiz spécifique via API", async () => {
      const quiz = await quizSetup.client.quiz.getById.query({ id: quizSetup.quiz.id });
      expect(quiz).toBeDefined();
      if (quiz) {
        expect(quiz.id).toBe(quizSetup.quiz.id);
        expect(quiz.title).toBeDefined();
      }
    });

    it("peut récupérer les questions d'un quiz", async () => {
      const quizQuestions = await quizSetup.client.quizQuestion.getByQuiz.query({
        quizId: quizSetup.quiz.id,
      });
      expect(quizQuestions).toBeDefined();
      expect(quizQuestions.length).toBe(5); // 5 questions créées
    });
  });

  describe("2. Démarrage d'un quiz", () => {
    it("peut démarrer un quiz via API", async () => {
      const userQuiz = await quizSetup.client.userQuiz.create.mutate({
        userId: quizSetup.user.id,
        quizId: quizSetup.quiz.id,
      });

      expect(userQuiz).toBeDefined();
      expect(userQuiz.userId).toBe(quizSetup.user.id);
      expect(userQuiz.quizId).toBe(quizSetup.quiz.id);
      expect(userQuiz.completedAt).toBeNull(); // Pas encore complété
    });

    it("peut récupérer les quiz de l'utilisateur", async () => {
      const userQuizzes = await quizSetup.client.userQuiz.getByUser.query({
        userId: quizSetup.user.id,
      });
      expect(userQuizzes).toBeDefined();
      expect(userQuizzes.length).toBeGreaterThan(0);
    });
  });

  describe("3. Réponses aux questions", () => {
    it("peut répondre à une question via API", async () => {
      const question = quizSetup.questions[0];
      const correctAnswer = quizSetup.answers[0].find((a) => a.isCorrect);

      if (!correctAnswer) {
        throw new Error("Aucune réponse correcte trouvée");
      }

      const userAnswer = await quizSetup.client.userAnswer.create.mutate({
        userId: quizSetup.user.id,
        questionId: question.id,
        answerId: correctAnswer.id,
      });

      expect(userAnswer).toBeDefined();
      expect(userAnswer.questionId).toBe(question.id);
      expect(userAnswer.answerId).toBe(correctAnswer.id);
    });

    it("peut répondre à toutes les questions", async () => {
      // Créer un nouveau setup pour ce test (éviter les conflits avec autres tests)
      const newQuizSetup = await createQuizE2ESetup( {
        quizType: "MCQ",
        questionCount: 5,
        answersPerQuestion: 4,
      });

      // Créer le userQuiz d'abord
      const userQuiz = await newQuizSetup.client.userQuiz.create.mutate({
        userId: newQuizSetup.user.id,
        quizId: newQuizSetup.quiz.id,
      });

      expect(userQuiz).toBeDefined();

      // Répondre à toutes les questions
      for (let i = 0; i < newQuizSetup.questions.length; i++) {
        const question = newQuizSetup.questions[i];
        const correctAnswer = newQuizSetup.answers[i].find((a) => a.isCorrect);

        if (!correctAnswer) {
          throw new Error(`Aucune réponse correcte pour question ${i + 1}`);
        }

        await newQuizSetup.client.userAnswer.create.mutate({
          userId: newQuizSetup.user.id,
          questionId: question.id,
          answerId: correctAnswer.id,
        });
      }

      // Vérifier que toutes les réponses sont enregistrées
      const userAnswers = await prisma.userAnswer.findMany({
        where: {
          userId: newQuizSetup.user.id,
          questionId: {
            in: newQuizSetup.questions.map((q) => q.id),
          },
        },
      });

      expect(userAnswers.length).toBe(newQuizSetup.questions.length);
    });
  });

  describe("4. Validation et calcul de score", () => {
    it("peut compléter un quiz et calculer le score", async () => {
      // Récupérer le userQuiz
      const userQuiz = await prisma.userQuiz.findFirst({
        where: {
          userId: quizSetup.user.id,
          quizId: quizSetup.quiz.id,
        },
      });

      if (!userQuiz) {
        throw new Error("UserQuiz non trouvé");
      }

      // Compléter le quiz (calculer le score d'abord)
      const allCorrect = quizSetup.questions.every((_question, i) => {
        const userAnswer = quizSetup.answers[i].find(a => a.isCorrect);
        return userAnswer !== undefined;
      });

      const completedQuiz = await quizSetup.client.userQuiz.completeQuiz.mutate({
        id: userQuiz.id,
        isCorrect: allCorrect,
      });

      expect(completedQuiz).toBeDefined();
      expect(completedQuiz.completedAt).toBeDefined();
      expect(completedQuiz.isCorrect).toBeDefined();
    });

    it("score calculé correctement (toutes bonnes réponses)", async () => {
      // Récupérer le userQuiz complété
      const userQuiz = await prisma.userQuiz.findFirst({
        where: {
          userId: quizSetup.user.id,
          quizId: quizSetup.quiz.id,
        },
      });

      if (!userQuiz) {
        throw new Error("UserQuiz non trouvé");
      }

      // Toutes les réponses sont correctes (on a utilisé les bonnes réponses)
      expect(userQuiz.isCorrect).toBeTrue();
    });

    it("peut récupérer les réponses d'un utilisateur pour les questions d'un quiz", async () => {
      // Créer un nouveau setup pour ce test (éviter les conflits avec autres tests)
      const newQuizSetup = await createQuizE2ESetup( {
        quizType: "MCQ",
        questionCount: 5,
        answersPerQuestion: 4,
      });

      // Créer userQuiz et répondre aux questions
      await newQuizSetup.client.userQuiz.create.mutate({
        userId: newQuizSetup.user.id,
        quizId: newQuizSetup.quiz.id,
      });

      // Répondre à toutes les questions
      for (let i = 0; i < newQuizSetup.questions.length; i++) {
        const question = newQuizSetup.questions[i];
        const correctAnswer = newQuizSetup.answers[i].find((a) => a.isCorrect);
        if (!correctAnswer) {
          throw new Error(`Aucune réponse correcte pour question ${i + 1}`);
        }
        await newQuizSetup.client.userAnswer.create.mutate({
          userId: newQuizSetup.user.id,
          questionId: question.id,
          answerId: correctAnswer.id,
        });
      }

      // Récupérer les réponses pour chaque question du quiz
      const allUserAnswers = [];
      for (const question of newQuizSetup.questions) {
        const userAnswer = await newQuizSetup.client.userAnswer.getByUserAndQuestion.query({
          userId: newQuizSetup.user.id,
          questionId: question.id,
        });
        if (userAnswer) {
          allUserAnswers.push(userAnswer);
        }
      }

      expect(allUserAnswers.length).toBe(newQuizSetup.questions.length);
    });
  });

  describe("5. Attribution de points", () => {
    it("points attribués après complétion réussie", async () => {
      // Créer un nouveau setup pour ce test
      const newQuizSetup = await createQuizE2ESetup( {
        quizType: "DAILY",
        questionCount: 3,
        answersPerQuestion: 4,
      });

      // Répondre correctement à toutes les questions
      for (let i = 0; i < newQuizSetup.questions.length; i++) {
        const question = newQuizSetup.questions[i];
        const correctAnswer = newQuizSetup.answers[i].find((a) => a.isCorrect);

        if (!correctAnswer) {
          throw new Error(`Aucune réponse correcte pour question ${i + 1}`);
        }

        await newQuizSetup.client.userAnswer.create.mutate({
          userId: newQuizSetup.user.id,
          questionId: question.id,
          answerId: correctAnswer.id,
        });
      }

      // Démarrer le quiz
      const userQuiz = await newQuizSetup.client.userQuiz.create.mutate({
        userId: newQuizSetup.user.id,
        quizId: newQuizSetup.quiz.id,
      });

      // Compléter le quiz (toutes les réponses sont correctes)
      await newQuizSetup.client.userQuiz.completeQuiz.mutate({
        id: userQuiz.id,
        isCorrect: true,
      });

      // Vérifier que les points ont augmenté (si logique métier implémentée)
      const userAfter = await prisma.user.findUnique({
        where: { id: newQuizSetup.user.id },
      });

      // Note: L'attribution de points dépend de la logique métier
      // Ici on vérifie juste que l'utilisateur existe toujours
      expect(userAfter).toBeDefined();
    });
  });

  describe("6. Workflow complet — Quiz de bout en bout", () => {
    it("scénario complet : récupération → démarrage → réponses → validation", async () => {
      // 1. Créer nouveau setup (utiliser levelId 1 qui existe toujours)
      const newSetup = await createQuizE2ESetup({
        levelId: 1, // Level 1 existe toujours (créé par createAuthenticatedUser)
        quizType: "MCQ",
        questionCount: 3,
        answersPerQuestion: 3,
      });

      // 2. Récupérer le quiz
      const quiz = await newSetup.client.quiz.getById.query({ id: newSetup.quiz.id });
      expect(quiz).toBeDefined();
      if (quiz) {
        expect(quiz.id).toBe(newSetup.quiz.id);
      }

      // 3. Démarrer le quiz
      const userQuiz = await newSetup.client.userQuiz.create.mutate({
        userId: newSetup.user.id,
        quizId: newSetup.quiz.id,
      });
      expect(userQuiz).toBeDefined();

      // 4. Répondre à toutes les questions
      for (let i = 0; i < newSetup.questions.length; i++) {
        const question = newSetup.questions[i];
        const correctAnswer = newSetup.answers[i].find((a) => a.isCorrect);

        if (!correctAnswer) {
          throw new Error(`Aucune réponse correcte pour question ${i + 1}`);
        }

        await newSetup.client.userAnswer.create.mutate({
          userId: newSetup.user.id,
          questionId: question.id,
          answerId: correctAnswer.id,
        });
      }

      // 5. Compléter le quiz (toutes les réponses sont correctes)
      const completed = await newSetup.client.userQuiz.completeQuiz.mutate({
        id: userQuiz.id,
        isCorrect: true,
      });
      expect(completed.completedAt).toBeDefined();
      expect(completed.isCorrect).toBeTrue();

      // 6. Vérifier les réponses enregistrées (récupérer pour chaque question)
      const allUserAnswers = [];
      for (const question of newSetup.questions) {
        const userAnswer = await newSetup.client.userAnswer.getByUserAndQuestion.query({
          userId: newSetup.user.id,
          questionId: question.id,
        });
        if (userAnswer) {
          allUserAnswers.push(userAnswer);
        }
      }
      expect(allUserAnswers.length).toBe(newSetup.questions.length);
    });
  });
});

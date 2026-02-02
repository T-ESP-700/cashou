// Service métier pour la gestion des quiz-questions du jeu
// Couche d'abstraction entre les routers et la base de données
import type { QuizQuestion, Question, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {QuizQuestionCreateSchema, QuizQuestionDataSchema} from "../schemas-zod/quiz-question-schema.ts";

export class QuizQuestionService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère toutes les quiz-questions
     * @returns Promise<QuizQuestion[]> - Liste complète des quiz-questions triées par position croissante (sans relations)
     */
    async findAll(): Promise<QuizQuestion[]> {
        return this.prisma.quizQuestion.findMany({
            orderBy: [
                { quizId: 'asc' },    // Tri par quiz d'abord
                { id: 'asc' }         // Puis par ID (ordre d'insertion)
            ],
            // Pas d'include - retourne seulement les données de la table quiz_questions
        });
    }

    /**
     * Récupère une quiz-question spécifique par son ID
     * @param id - Identifiant unique de la quiz-question
     * @returns Promise<QuizQuestion | null> - La quiz-question trouvée ou null si inexistante (sans relations)
     */
    async findOne(id: number): Promise<QuizQuestion | null> {
        return this.prisma.quizQuestion.findUnique({
            where: { id }
            // Pas d'include - retourne seulement les données de la table quiz_questions
        });
    }

    /**
     * Crée une nouvelle quiz-question
     * @param data - Données de la quiz-question validées par le schéma Zod
     * @returns Promise<QuizQuestion> - La quiz-question créée avec son ID généré
     * @throws Error si une question existe déjà à cette position pour ce quiz ou si la question est déjà dans ce quiz
     */
    async create(data: QuizQuestionCreateSchema): Promise<QuizQuestion> {
        // Vérifications d'unicité si quizId et les autres champs sont fournis
        if (data.quizId && data.questionId) {
            // Vérification de l'unicité de la question dans le quiz
            const existingQuestionInQuiz = await this.prisma.quizQuestion.findFirst({
                where: {
                    quizId: data.quizId,
                    questionId: data.questionId
                }
            });

            if (existingQuestionInQuiz) {
                throw new Error(`La question ${data.questionId} est déjà présente dans le quiz ${data.quizId}`);
            }
        }

        return this.prisma.quizQuestion.create({ data });
    }

    /**
     * Met à jour une quiz-question existante
     * @param id - Identifiant de la quiz-question à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<QuizQuestion> - La quiz-question mise à jour
     * @throws Error si une autre question existe déjà à cette position pour ce quiz ou si la question est déjà dans ce quiz
     */
    async update(id: number, data: QuizQuestionDataSchema): Promise<QuizQuestion> {
        // Vérifications d'unicité si quizId et questionId sont modifiés
        if (data.quizId && data.questionId) {
            // Vérification de l'unicité de la question dans le quiz
            const existingQuestionInQuiz = await this.prisma.quizQuestion.findFirst({
                where: {
                    quizId: data.quizId,
                    questionId: data.questionId,
                    NOT: { id } // Exclure l'enregistrement qu'on est en train de modifier
                }
            });

            if (existingQuestionInQuiz) {
                throw new Error(`La question ${data.questionId} est déjà présente dans le quiz ${data.quizId}`);
            }
        }

        return this.prisma.quizQuestion.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime une quiz-question
     * @param id - Identifiant de la quiz-question à supprimer
     * @returns Promise<QuizQuestion> - La quiz-question supprimée (pour confirmation)
     */
    async delete(id: number): Promise<QuizQuestion> {
        return this.prisma.quizQuestion.delete({ where: { id } });
    }

    /**
     * Récupère toutes les questions d'un quiz spécifique
     * @param quizId - Identifiant du quiz
     * @returns Promise<QuizQuestion[]> - Liste des quiz-questions du quiz (sans relations)
     */
    async findByQuiz(quizId: number): Promise<QuizQuestion[]> {
        return this.prisma.quizQuestion.findMany({
            where: { quizId },
            orderBy: { id: 'asc' } // Tri par ID (ordre d'insertion)
            // Pas d'include - retourne seulement les données de la table quiz_questions
        });
    }

    /**
     * Récupère tous les quiz contenant une question spécifique
     * @param questionId - Identifiant de la question
     * @returns Promise<QuizQuestion[]> - Liste des quiz-questions pour cette question (sans relations)
     */
    async findByQuestion(questionId: number): Promise<QuizQuestion[]> {
        return this.prisma.quizQuestion.findMany({
            where: { questionId },
            orderBy: [
                { quizId: 'asc' },    // Tri par quiz
                { id: 'asc' }         // Puis par ID (ordre d'insertion)
            ]
            // Pas d'include - retourne seulement les données de la table quiz_questions
        });
    }

    /**
     * Récupère toutes les questions d'un quiz avec leurs réponses
     * @param quizId - Identifiant du quiz
     * @returns Promise<Array> - Liste des questions avec leurs réponses, ordonnées par position
     */
    async findQuestionsWithAnswersByQuiz(quizId: number) {
        return this.prisma.quizQuestion.findMany({
            where: { quizId },
            orderBy: { id: 'asc' },
            include: {
                question: {
                    include: {
                        answers: {
                            orderBy: { id: 'asc' } // Ordre stable pour les réponses
                        }
                    }
                }
            }
        });
    }

    // === NOUVELLES MÉTHODES POUR LES ROUTES PERSONNALISÉES ===

    /**
     * Mélanger l'ordre des questions d'un quiz
     * NOTE: Le champ 'position' n'existe pas dans le schéma. Cette méthode retourne simplement les questions dans un ordre aléatoire.
     * @param quizId - Identifiant du quiz
     * @returns Promise<QuizQuestion[]> - Questions mélangées
     */
    async shuffleQuizOrder(quizId: number) {
        // Récupérer toutes les questions du quiz
        const questions = await this.prisma.quizQuestion.findMany({
            where: { quizId },
            include: {
                question: {
                    select: {
                        id: true,
                        text: true
                    }
                }
            }
        });

        if (questions.length === 0) {
            throw new Error("Aucune question trouvée pour ce quiz");
        }

        // Mélanger l'ordre des questions (Fisher-Yates shuffle)
        const shuffled = [...questions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    /**
     * Rechercher dans les questions d'un quiz par mot-clé
     * @param quizId - Identifiant du quiz
     * @param keyword - Mot-clé à rechercher
     * @returns Promise<QuizQuestion[]> - Questions correspondantes
     */
    async searchInQuiz(quizId: number, keyword: string) {
        return this.prisma.quizQuestion.findMany({
            where: {
                quizId,
                question: {
                    text: {
                        contains: keyword,
                        mode: 'insensitive'
                    }
                }
            },
            include: {
                question: {
                    select: {
                        id: true,
                        text: true
                    }
                }
            },
            orderBy: { id: 'asc' }
        });
    }

    /**
     * Valider la structure d'un quiz
     * @param quizId - Identifiant du quiz
     * @returns Promise<object> - Rapport de validation
     */
    async validateQuizStructure(quizId: number) {
        const questions = await this.prisma.quizQuestion.findMany({
            where: { quizId },
            include: {
                question: true
            },
            orderBy: { id: 'asc' }
        });

        const errors: string[] = [];
        const warnings: string[] = [];

        // Vérifier que le quiz existe
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId }
        });

        if (!quiz) {
            errors.push(`Quiz avec l'ID ${quizId} introuvable`);
            return {
                isValid: false,
                errors,
                warnings,
                questionsCount: 0
            };
        }

        // Vérifier les questions manquantes
        const missingQuestions = questions.filter((q: QuizQuestion & { question: Question | null }) => !q.question);
        if (missingQuestions.length > 0) {
            errors.push(`${missingQuestions.length} question(s) référencée(s) mais introuvable(s)`);
        }

        // Recommandations
        if (questions.length === 0) {
            warnings.push("Quiz vide - aucune question");
        } else if (questions.length < 3) {
            warnings.push("Quiz avec peu de questions (< 3)");
        } else if (questions.length > 20) {
            warnings.push("Quiz avec beaucoup de questions (> 20)");
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            questionsCount: questions.length,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                type: quiz.type
            }
        };
    }

    /**
     * Sélectionner aléatoirement des questions d'un quiz MCQ avec leurs réponses
     * @param quizId - Identifiant du quiz
     * @param count - Nombre de questions à sélectionner (défaut: 3)
     * @returns Promise<QuizQuestion[]> - Questions sélectionnées aléatoirement
     */
    async getRandomQuestionsFromQuiz(quizId: number, count: number = 3) {
        // Vérifier que le quiz existe et est de type MCQ
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId }
        });

        if (!quiz) {
            throw new Error(`Quiz avec l'ID ${quizId} introuvable`);
        }

        if (quiz.type !== 'MCQ') {
            throw new Error(`Cette route est réservée aux quiz MCQ. Le quiz ${quizId} est de type ${quiz.type}`);
        }

        // Récupérer toutes les questions du quiz
        const allQuestions = await this.prisma.quizQuestion.findMany({
            where: { quizId },
            include: {
                question: {
                    include: {
                        answers: {
                            orderBy: { id: 'asc' }
                        }
                    }
                }
            }
        });

        if (allQuestions.length === 0) {
            throw new Error(`Aucune question trouvée pour le quiz ${quizId}`);
        }

        if (allQuestions.length < count) {
            throw new Error(`Le quiz ${quizId} n'a que ${allQuestions.length} question(s), impossible d'en sélectionner ${count}`);
        }

        // Mélanger et sélectionner le nombre demandé
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, count);

        // Réassigner des positions temporaires pour l'ordre de présentation
        return selectedQuestions.map((question, index) => ({
            ...question,
            temporaryPosition: index + 1 // Position pour l'affichage (1, 2, 3...)
        }));
    }
}

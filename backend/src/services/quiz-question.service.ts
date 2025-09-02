// Service métier pour la gestion des quiz-questions du jeu
// Couche d'abstraction entre les routers et la base de données
import type { QuizQuestion, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
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
                { position: 'asc' }   // Puis par position dans le quiz
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
        if (data.quizId) {
            // 1. Vérification de l'unicité de la question dans le quiz
            if (data.questionId) {
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

            // 2. Vérification de l'unicité de la position dans le quiz
            if (data.position) {
                const existingPositionInQuiz = await this.prisma.quizQuestion.findFirst({
                    where: {
                        quizId: data.quizId,
                        position: data.position
                    }
                });

                if (existingPositionInQuiz) {
                    throw new Error(`Une question existe déjà à la position ${data.position} pour le quiz ${data.quizId}`);
                }
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
        // Vérifications d'unicité si quizId et les autres champs sont modifiés
        if (data.quizId) {
            // 1. Vérification de l'unicité de la question dans le quiz
            if (data.questionId) {
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

            // 2. Vérification de l'unicité de la position dans le quiz
            if (data.position) {
                const existingPositionInQuiz = await this.prisma.quizQuestion.findFirst({
                    where: {
                        quizId: data.quizId,
                        position: data.position,
                        NOT: { id } // Exclure l'enregistrement qu'on est en train de modifier
                    }
                });

                if (existingPositionInQuiz) {
                    throw new Error(`Une autre question existe déjà à la position ${data.position} pour le quiz ${data.quizId}`);
                }
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
            orderBy: { position: 'asc' } // Tri par position dans le quiz
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
                { position: 'asc' }   // Puis par position
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
            orderBy: { position: 'asc' },
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
}

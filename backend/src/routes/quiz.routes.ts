import { QuizController } from '../controllers/quiz.controller';

export class QuizRoutes {
  private quizController: QuizController;

  constructor() {
    this.quizController = new QuizController();
  }

  /**
   * Router principal pour les routes des quiz
   */
  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    try {
      // Route GET /api/quiz
      if (pathname === '/api/quiz' && method === 'GET') {
        return await this.quizController.getAllQuiz(req);
      }

      return this.notFound();
    } catch (error) {
      console.error('Erreur dans le routeur des quiz:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur interne du serveur',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  /**
   * Vérifie si l'URL correspond aux routes des quiz
   */
  static matches(pathname: string): boolean {
    return pathname.startsWith('/api/quiz');
  }

  /**
   * Réponse pour route non trouvée
   */
  private notFound(): Response {
    return new Response(
      JSON.stringify({ error: 'Route non trouvée' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Documentation des endpoints disponibles:
 * 
 * GET    /api/quiz                       - Récupère tous les quiz (avec pagination et filtres)
 * 
 * Paramètres de requête pour GET /api/quiz:
 * - type: string ('daily' | 'MCQ') - filtre par type
 * - levelId: number - filtre par niveau
 * - includeLevel: boolean (inclut les informations du niveau)
 * - includeUserQuiz: boolean (inclut les réponses des utilisateurs)
 * - includeQuestions: boolean (inclut les questions du quiz)
 * - page: number (numéro de page, défaut: 1)
 * - limit: number (limite par page, défaut: 10)
 */

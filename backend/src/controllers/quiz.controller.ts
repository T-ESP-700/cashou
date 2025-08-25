import { QuizService } from '../services/quiz.service';
import type { QuizQuery } from '../types/quiz.types';

export class QuizController {
  private quizService: QuizService;

  constructor() {
    this.quizService = new QuizService();
  }

  /**
   * GET /quiz
   * Récupère tous les quiz avec pagination et filtres
   */
  async getAllQuiz(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const searchParams = url.searchParams;
      
      const query: QuizQuery = {
        type: searchParams.get('type') as 'daily' | 'MCQ' || undefined,
        levelId: searchParams.get('levelId') ? parseInt(searchParams.get('levelId')!) : undefined,
        includeLevel: searchParams.get('includeLevel') === 'true',
        includeUserQuiz: searchParams.get('includeUserQuiz') === 'true',
        includeQuestions: searchParams.get('includeQuestions') === 'true',
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10')
      };

      const result = await this.quizService.getAllQuiz(query);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des quiz:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la récupération des quiz',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

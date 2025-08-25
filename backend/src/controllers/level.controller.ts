import { LevelService } from '../services/level.service';
import type { LevelQuery } from '../types/level.types';

export class LevelController {
  private levelService: LevelService;

  constructor() {
    this.levelService = new LevelService();
  }

  /**
   * GET /levels
   * Récupère tous les levels avec pagination et filtres
   */
  async getAllLevels(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const searchParams = url.searchParams;
      
      const query: LevelQuery = {
        number: searchParams.get('number') ? parseInt(searchParams.get('number')!) : undefined,
        includeUsers: searchParams.get('includeUsers') === 'true',
        includeGameInstances: searchParams.get('includeGameInstances') === 'true',
        includeQuiz: searchParams.get('includeQuiz') === 'true',
        includeGoals: searchParams.get('includeGoals') === 'true',
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10')
      };

      const result = await this.levelService.getAllLevels(query);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des levels:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la récupération des levels',
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

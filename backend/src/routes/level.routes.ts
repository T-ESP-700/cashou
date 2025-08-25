import { LevelController } from '../controllers/level.controller';

export class LevelRoutes {
  private levelController: LevelController;

  constructor() {
    this.levelController = new LevelController();
  }

  /**
   * Router principal pour les routes des levels
   */
  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    try {
      // Route GET /api/levels
      if (pathname === '/api/levels' && method === 'GET') {
        return await this.levelController.getAllLevels(req);
      }

      return this.notFound();
    } catch (error) {
      console.error('Erreur dans le routeur des levels:', error);
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
   * Vérifie si l'URL correspond aux routes des levels
   */
  static matches(pathname: string): boolean {
    return pathname.startsWith('/api/levels');
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
 * GET    /api/levels                     - Récupère tous les levels (avec pagination et filtres)
 * 
 * Paramètres de requête pour GET /api/levels:
 * - number: number - filtre par numéro de niveau
 * - includeUsers: boolean (inclut les utilisateurs du niveau)
 * - includeGameInstances: boolean (inclut les instances de jeu)
 * - includeQuiz: boolean (inclut les quiz du niveau)
 * - includeGoals: boolean (inclut les objectifs du niveau)
 * - page: number (numéro de page, défaut: 1)
 * - limit: number (limite par page, défaut: 10)
 */

import { MarketController } from '../controllers/market.controller';

export class MarketRoutes {
  private marketController: MarketController;

  constructor() {
    this.marketController = new MarketController();
  }

  /**
   * Router principal pour les routes des markets
   */
  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    // Extraire l'ID du market depuis l'URL si présent
    const marketIdMatch = pathname.match(/^\/api\/markets\/(\d+)(.*)$/);
    const marketId = marketIdMatch ? marketIdMatch[1] : null;
    const subPath = marketIdMatch ? marketIdMatch[2] : '';

    try {
      // Routes sans ID de market
      if (pathname === '/api/markets') {
        switch (method) {
          case 'GET':
            return await this.marketController.getAllMarkets(req);
          case 'POST':
            return await this.marketController.createMarket(req);
          default:
            return this.methodNotAllowed();
        }
      }

      // Route de recherche
      if (pathname === '/api/markets/search' && method === 'GET') {
        return await this.marketController.searchMarkets(req);
      }

      // Routes avec ID de market
      if (marketId) {
        switch (subPath) {
          case '':
            switch (method) {
              case 'GET':
                return await this.marketController.getMarketById(req, marketId);
              case 'PUT':
                return await this.marketController.updateMarket(req, marketId);
              case 'DELETE':
                return await this.marketController.deleteMarket(req, marketId);
              default:
                return this.methodNotAllowed();
            }
          case '/stats':
            if (method === 'GET') {
              return await this.marketController.getMarketStats(req, marketId);
            }
            return this.methodNotAllowed();
          default:
            return this.notFound();
        }
      }

      return this.notFound();
    } catch (error) {
      console.error('Erreur dans le routeur des markets:', error);
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
   * Vérifie si l'URL correspond aux routes des markets
   */
  static matches(pathname: string): boolean {
    return pathname.startsWith('/api/markets');
  }

  /**
   * Réponse pour méthode non autorisée
   */
  private methodNotAllowed(): Response {
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée' }),
      {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          'Allow': 'GET, POST, PUT, DELETE'
        }
      }
    );
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
 * GET    /api/markets                    - Récupère tous les markets (avec pagination et filtres)
 * POST   /api/markets                    - Crée un nouveau market
 * GET    /api/markets/search             - Recherche des markets par nom ou description
 * GET    /api/markets/:id                - Récupère un market par ID
 * PUT    /api/markets/:id                - Met à jour un market
 * DELETE /api/markets/:id                - Supprime un market
 * GET    /api/markets/:id/stats          - Récupère les statistiques d'un market
 * 
 * Paramètres de requête pour GET /api/markets:
 * - name: string (filtre par nom)
 * - includeSubmarkets: boolean (inclut les sous-marchés)
 * - includeAssets: boolean (inclut les actifs)
 * - includeFields: boolean (inclut les champs)
 * - page: number (numéro de page, défaut: 1)
 * - limit: number (limite par page, défaut: 10)
 * 
 * Paramètres de requête pour GET /api/markets/:id:
 * - includeRelations: boolean (inclut toutes les relations)
 * 
 * Paramètres de requête pour GET /api/markets/search:
 * - q: string (terme de recherche, requis)
 * - limit: number (limite de résultats, défaut: 10)
 */

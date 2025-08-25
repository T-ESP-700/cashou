import { MarketService } from '../services/market.service';
import type { CreateMarketDto, UpdateMarketDto, MarketQuery } from '../types/market.types';

export class MarketController {
  private marketService: MarketService;

  constructor() {
    this.marketService = new MarketService();
  }

  /**
   * GET /markets
   * Récupère tous les markets avec pagination et filtres
   */
  async getAllMarkets(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const searchParams = url.searchParams;
      
      const query: MarketQuery = {
        name: searchParams.get('name') || undefined,
        includeSubmarkets: searchParams.get('includeSubmarkets') === 'true',
        includeAssets: searchParams.get('includeAssets') === 'true',
        includeFields: searchParams.get('includeFields') === 'true',
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10')
      };

      const result = await this.marketService.getAllMarkets(query);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des markets:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la récupération des markets',
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
   * GET /markets/:id
   * Récupère un market par son ID
   */
  async getMarketById(req: Request, id: string): Promise<Response> {
    try {
      const marketId = parseInt(id);
      if (isNaN(marketId)) {
        return new Response(
          JSON.stringify({ error: 'ID de market invalide' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const url = new URL(req.url);
      const includeRelations = url.searchParams.get('includeRelations') === 'true';
      
      const market = await this.marketService.getMarketById(marketId, includeRelations);
      
      if (!market) {
        return new Response(
          JSON.stringify({ error: 'Market non trouvé' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(JSON.stringify(market), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du market:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la récupération du market',
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
   * POST /markets
   * Crée un nouveau market
   */
  async createMarket(req: Request): Promise<Response> {
    try {
      const body = await req.json() as CreateMarketDto;
      
      // Validation basique
      if (!body.name && !body.description) {
        return new Response(
          JSON.stringify({ error: 'Au moins un nom ou une description est requis' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const market = await this.marketService.createMarket(body);
      
      return new Response(JSON.stringify(market), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erreur lors de la création du market:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la création du market',
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
   * PUT /markets/:id
   * Met à jour un market existant
   */
  async updateMarket(req: Request, id: string): Promise<Response> {
    try {
      const marketId = parseInt(id);
      if (isNaN(marketId)) {
        return new Response(
          JSON.stringify({ error: 'ID de market invalide' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Vérifier si le market existe
      const exists = await this.marketService.marketExists(marketId);
      if (!exists) {
        return new Response(
          JSON.stringify({ error: 'Market non trouvé' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const body = await req.json() as UpdateMarketDto;
      const market = await this.marketService.updateMarket(marketId, body);
      
      return new Response(JSON.stringify(market), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du market:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la mise à jour du market',
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
   * DELETE /markets/:id
   * Supprime un market
   */
  async deleteMarket(req: Request, id: string): Promise<Response> {
    try {
      const marketId = parseInt(id);
      if (isNaN(marketId)) {
        return new Response(
          JSON.stringify({ error: 'ID de market invalide' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Vérifier si le market existe
      const exists = await this.marketService.marketExists(marketId);
      if (!exists) {
        return new Response(
          JSON.stringify({ error: 'Market non trouvé' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      await this.marketService.deleteMarket(marketId);
      
      return new Response(
        JSON.stringify({ message: 'Market supprimé avec succès' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Erreur lors de la suppression du market:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la suppression du market',
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
   * GET /markets/:id/stats
   * Récupère les statistiques d'un market
   */
  async getMarketStats(req: Request, id: string): Promise<Response> {
    try {
      const marketId = parseInt(id);
      if (isNaN(marketId)) {
        return new Response(
          JSON.stringify({ error: 'ID de market invalide' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Vérifier si le market existe
      const exists = await this.marketService.marketExists(marketId);
      if (!exists) {
        return new Response(
          JSON.stringify({ error: 'Market non trouvé' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const stats = await this.marketService.getMarketStats(marketId);
      
      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la récupération des statistiques',
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
   * GET /markets/search
   * Recherche des markets
   */
  async searchMarkets(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const searchTerm = url.searchParams.get('q');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      
      if (!searchTerm) {
        return new Response(
          JSON.stringify({ error: 'Paramètre de recherche requis (q)' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const markets = await this.marketService.searchMarkets(searchTerm, limit);
      
      return new Response(JSON.stringify(markets), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erreur lors de la recherche de markets:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la recherche de markets',
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

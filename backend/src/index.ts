
import { MarketRoutes } from './routes/market.routes';
import { QuizRoutes } from './routes/quiz.routes';
import { LevelRoutes } from './routes/level.routes';

const marketRoutes = new MarketRoutes();
const quizRoutes = new QuizRoutes();
const levelRoutes = new LevelRoutes();

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK');
    }

    // API Routes
    if (MarketRoutes.matches(url.pathname)) {
      return await marketRoutes.handleRequest(req);
    }

    if (QuizRoutes.matches(url.pathname)) {
      return await quizRoutes.handleRequest(req);
    }

    if (LevelRoutes.matches(url.pathname)) {
      return await levelRoutes.handleRequest(req);
    }

    // Default response
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        message: 'Cashou Backend API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          markets: '/api/markets',
          quiz: '/api/quiz',
          levels: '/api/levels'
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 404 for unhandled routes
    return new Response(JSON.stringify({ error: 'Route non trouvée' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
});

console.log(`Backend listening on http://localhost:${server.port}`);

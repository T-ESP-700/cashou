import { auth } from '@cashou/auth/server';
import { createContext } from './trpc';
import { trpcRouter } from './trpc/router';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { cors } from './middleware/cors';
import { getJobQueue, stopJobQueue } from './lib/job-queue';
import { startGameEventWorkers } from './workers/game-event.worker';
import { prisma } from './database';
import { canUserJoinGame, leaveGame, switchGameRoom, sendToSocket, startTicker, stopTicker } from './ws/game-socket';
import { buildGameStateSnapshot } from './ws/game-state-snapshot';
import type { GameSocketData } from './ws/game-socket';
import type { ServerWebSocket } from 'bun';

// Server instance variable to track if server is already running
let serverInstance: ReturnType<typeof Bun.serve> | null = null;

// Start server only if not already started and not in test mode during imports
async function startServer() {
  if (serverInstance) {
    return serverInstance;
  }

  // Initialize pg-boss job queue and workers
  try {
    console.log('Initializing job queue...');
    await getJobQueue();
    await startGameEventWorkers();
    startTicker(prisma);
    console.log('Job queue, workers, and WebSocket ticker initialized successfully');
  } catch (error) {
    console.error('Failed to initialize job queue:', error);
    // Don't fail server startup, but log the error
  }

  // Determine port: TEST_PORT for tests, PORT for env, default 3000
  const port = parseInt(process.env.TEST_PORT || process.env.PORT || '3000');
  
  serverInstance = Bun.serve({
    port,
    hostname: '0.0.0.0', // Listen on all network interfaces
    async fetch(req, server) {
      const url = new URL(req.url);

      // CORS headers for all requests
      const corsHeaders = cors();

      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // WebSocket upgrade for /ws/game
      if (url.pathname === '/ws/game') {
        const token = url.searchParams.get('token');
        if (!token) {
          return new Response(JSON.stringify({ error: 'Missing token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate token against session table (same logic as tRPC context)
        const sessionData = await prisma.session.findUnique({
          where: { token },
          include: { user: true },
        });

        if (!sessionData || sessionData.expiresAt <= new Date()) {
          return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const upgraded = server.upgrade(req, {
          data: {
            userId: sessionData.user.id,
            gameInstanceId: '',
          },
        });

        if (upgraded) {
          // Bun convention: return undefined on successful upgrade
          return undefined as unknown as Response;
        }

        return new Response('WebSocket upgrade failed', {
          status: 500,
          headers: corsHeaders,
        });
      }

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response('OK', { headers: corsHeaders });
      }

      // Route d'accueil - Retourne un message simple pour vérifier que le serveur fonctionne
      if (url.pathname === "/") {
          return new Response("Cashou Backend API", {
              status: 200,
              headers: {
                  "Content-Type": "text/plain",
              },
          });
      }

      // Better-auth endpoints
      if (url.pathname.startsWith('/api/auth')) {
        try {
          console.log('Auth request:', req.method, url.pathname);

          // Clone the request to read the body for debugging
          const clonedReq = req.clone();
          if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
            try {
              const body = await clonedReq.json();
              console.log('Request body:', body);
            } catch (e) {
              console.error('Failed to parse request body:', e);
            }
          }

          const response = await auth.handler(req);

          // Add CORS headers to auth response
          Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
          });

          return response;
        } catch (error) {
          console.error('Auth handler error:', error);
          return new Response(JSON.stringify({ error: 'Authentication error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // tRPC endpoints
      if (url.pathname.startsWith('/api/trpc')) {
        const response = await fetchRequestHandler({
          endpoint: '/api/trpc',
          req,
          router: trpcRouter,
          createContext,
          onError: ({ error }) => {
            console.error('tRPC Error:', error);
          },
        });

        // Add CORS headers to tRPC response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      }

      // Default response
      return new Response('Cashou Backend API', { headers: corsHeaders });
    },
    websocket: {
      open(_ws: ServerWebSocket<GameSocketData>) {
        // No-op: wait for client to send a "join" message
      },
      message(ws: ServerWebSocket<GameSocketData>, msg: string | Buffer) {
        void (async () => {
          try {
            const data = JSON.parse(msg as string);
            if (data.type === 'join' && data.payload?.gameInstanceId) {
              const requestedGameInstanceId = String(data.payload.gameInstanceId);
              const canJoin = await canUserJoinGame(
                ws.data.userId,
                requestedGameInstanceId,
                prisma
              );

              if (!canJoin) {
                ws.send(JSON.stringify({
                  type: 'game:error',
                  payload: { message: 'Unauthorized game access' },
                }));
                ws.close();
                return;
              }

              switchGameRoom(ws, requestedGameInstanceId);

              // Send immediate game:state snapshot to the joining client
              try {
                const numericId = Number(requestedGameInstanceId);
                if (Number.isInteger(numericId) && numericId > 0) {
                  const gameInstance = await prisma.gameInstance.findUnique({
                    where: { id: numericId },
                    include: { level: true },
                  });
                  if (gameInstance) {
                    const snapshot = buildGameStateSnapshot(gameInstance);
                    if (snapshot) {
                      sendToSocket(ws, { type: 'game:state', payload: snapshot });
                    }
                  } else {
                    sendToSocket(ws, {
                      type: 'game:error',
                      payload: { message: 'Game instance not found' },
                    });
                  }
                }
              } catch (err) {
                console.error('[WS] Error sending initial game:state:', err);
              }
            }
          } catch {
            // Ignore malformed messages
          }
        })();
      },
      close(ws: ServerWebSocket<GameSocketData>) {
        leaveGame(ws);
      },
    },
  });

  console.log(`Backend listening on http://localhost:${serverInstance.port}`);
  console.log(`Auth endpoints available at http://localhost:${serverInstance.port}/api/auth/*`);
  console.log(`tRPC endpoints available at http://localhost:${serverInstance.port}/api/trpc/*`);

  // Return an object with both the server instance and a proper stop method
  return {
    ...serverInstance,
    stop: async () => {
      console.log('Stopping server and job queue...');
      try {
        await stopJobQueue();
        console.log('Job queue stopped');
      } catch (error) {
        console.error('Error stopping job queue:', error);
      }
      if (serverInstance) {
        serverInstance.stop();
        serverInstance = null;
        console.log('Server stopped');
      }
    }
  };
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);

  stopTicker();

  try {
    await stopJobQueue();
    console.log('Job queue stopped');
  } catch (error) {
    console.error('Error stopping job queue:', error);
  }

  if (serverInstance) {
    serverInstance.stop();
    console.log('Server stopped');
  }

  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Only start server if this file is run directly (not imported by tests)
if (import.meta.main) {
  startServer();
}

export { startServer, serverInstance };

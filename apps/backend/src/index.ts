import { auth } from '@cashou/auth/server';
import { createContext } from './trpc';
import { trpcRouter } from './trpc/router';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { cors } from './middleware/cors';
import { getJobQueue, stopJobQueue, getJobQueueInstance } from './lib/job-queue';
import { issueWsTicket, consumeWsTicket, startWsTicketSweeper, stopWsTicketSweeper } from './lib/ws-ticket';
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
    startWsTicketSweeper();
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

      // CORS headers for all requests (reflection de l'origine, restreinte en prod)
      const corsHeaders = cors(req.headers.get('origin'));

      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // WebSocket upgrade for /ws/game — ouverture via ticket éphémère (cf. lib/ws-ticket)
      if (url.pathname === '/ws/game') {
        const ticket = url.searchParams.get('ticket');
        if (!ticket) {
          return new Response(JSON.stringify({ error: 'Missing ticket' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Le ticket est à usage unique et de courte durée ; sa validité prouve l'identité.
        const userId = consumeWsTicket(ticket);
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Invalid or expired ticket' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const upgraded = server.upgrade(req, {
          data: {
            userId,
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

      // Émission d'un ticket WebSocket : échange le token de session (header Authorization)
      // contre un ticket éphémère, pour ne jamais exposer le token dans l'URL du WebSocket.
      if (url.pathname === '/api/ws-ticket') {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const authHeader = req.headers.get('authorization');
        const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        if (!bearer) {
          return new Response(JSON.stringify({ error: 'Missing token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const sessionData = await prisma.session.findUnique({
          where: { token: bearer },
          include: { user: true },
        });

        if (!sessionData || sessionData.expiresAt <= new Date()) {
          return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const ticket = issueWsTicket(sessionData.user.id);
        return new Response(JSON.stringify({ ticket }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Health check endpoint — profond : la base est vitale (503 si KO pour que
      // l'orchestrateur réagisse), la job-queue est signalée mais non bloquante
      // (un échec de queue ne doit pas déclencher un crash-loop, cf. spec R3 différé).
      if (url.pathname === '/health') {
        try {
          await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('db healthcheck timeout')), 2000)
            ),
          ]);
        } catch {
          return new Response(JSON.stringify({ status: 'error', db: 'down' }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const queueUp = getJobQueueInstance() !== null;
        return new Response(
          JSON.stringify({ status: 'ok', db: 'ok', queue: queueUp ? 'ok' : 'down' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
      // NB : ne JAMAIS logger le body (il contient mots de passe et emails en clair).
      if (url.pathname.startsWith('/api/auth')) {
        try {
          const response = await auth.handler(req);

          // Add CORS headers to auth response
          Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
          });

          return response;
        } catch (error) {
          console.error('Auth handler error:', (error as Error).message);
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
          onError: ({ error, path }) => {
            // Ne pas logger l'objet Error complet (stack/inputs potentiellement sensibles).
            console.error('tRPC Error:', error.code, path ?? '', error.message);
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
  stopWsTicketSweeper();

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

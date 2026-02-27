import { auth } from '@cashou/auth/server';
import { createContext } from './trpc';
import { trpcRouter } from './trpc/router';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { cors } from './middleware/cors';
import { getJobQueue, stopJobQueue } from './lib/job-queue';
import { startGameEventWorkers } from './workers/game-event.worker';

interface ServerHandle {
  stop(): void | Promise<void>;
}

let serverInstance: ReturnType<typeof Bun.serve> | null = null;
let startServerPromise: Promise<ServerHandle> | null = null;

// Start server only if not already started and not in test mode during imports
async function startServer() {
  if (startServerPromise) {
    return startServerPromise;
  }
  startServerPromise = _startServerInternal();
  return startServerPromise;
}

async function _startServerInternal() {
  if (serverInstance) {
    return serverInstance;
  }

  const port = parseInt(process.env.TEST_PORT || process.env.PORT || '3000');

  // Check if port is already in use (another test file may have started the server)
  try {
    const probe = await fetch(`http://localhost:${port}/health`);
    if (probe.ok) {
      console.log(`Server already running on port ${port}, reusing.`);
      return { stop() {} };
    }
  } catch {
    // Port not in use, proceed with startup
  }

  // Initialize pg-boss job queue and workers
  try {
    console.log('Initializing job queue...');
    await getJobQueue();
    await startGameEventWorkers();
    console.log('Job queue and workers initialized successfully');
  } catch (error) {
    console.error('Failed to initialize job queue:', error);
    // Don't fail server startup, but log the error
  }

  try {
  serverInstance = Bun.serve({
    port,
    hostname: '0.0.0.0', // Listen on all network interfaces
    async fetch(req) {
      const url = new URL(req.url);

      // CORS headers for all requests
      const corsHeaders = cors();

      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
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
        try {
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
        } catch (error) {
          console.error('Unhandled tRPC handler error:', error);
          return new Response(
            JSON.stringify({ error: 'Internal Server Error' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // Default response
      return new Response('Cashou Backend API', { headers: corsHeaders });
    },
  });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'EADDRINUSE') {
      console.log(`Port ${port} already in use, reusing existing server.`);
      return { stop() {} };
    }
    throw e;
  }

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

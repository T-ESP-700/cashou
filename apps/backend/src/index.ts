import { auth } from '@cashou/auth/server';
import { createContext } from './trpc';
import { trpcRouter } from './trpc/router';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { cors } from './middleware/cors';

const server = Bun.serve({
  port: 3000,
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
        return new Response("Cashou backend", {
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
        console.log('Origin header:', req.headers.get('origin'));
        console.log('Content-Type:', req.headers.get('content-type'));

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

        // In development, add Origin header if missing (for tools like Bruno, Postman)
        let requestToHandle = req;
        if (process.env.NODE_ENV !== 'production' && !req.headers.get('origin')) {
          // Create a new request with Origin header set to localhost
          const headers = new Headers(req.headers);
          headers.set('origin', 'http://localhost:3000');
          
          // Recreate the request with the new headers
          requestToHandle = new Request(req.url, {
            method: req.method,
            headers: headers,
            body: req.body,
            // @ts-ignore - Bun specific
            duplex: 'half',
          });
        }

        const response = await auth.handler(requestToHandle);

        // Log response status for debugging
        console.log('Auth response status:', response.status);

        // If response is not ok, log the error body
        if (!response.ok) {
          try {
            const errorBody = await response.clone().text();
            console.error('Auth error response:', errorBody);
          } catch (e) {
            console.error('Failed to read error response:', e);
          }
        }

        // Add CORS headers to auth response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      } catch (error) {
        console.error('Auth handler error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return new Response(JSON.stringify({ 
          error: 'Authentication error',
          message: error instanceof Error ? error.message : String(error),
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // tRPC endpoints
    if (url.pathname.startsWith('/api/trpc')) {
      return fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: trpcRouter,
        createContext,
        onError: ({ error, type: _type, path: _path, input: _input, ctx: _ctx, req: _req }) => {
          console.error('tRPC Error:', error);
        },
      });
    }

    // Default response
    return new Response('Cashou Backend API', { headers: corsHeaders });
  },
});

console.log(`Backend listening on http://localhost:${server.port}`);
console.log('Auth endpoints available at http://localhost:3000/api/auth/*');
console.log('tRPC endpoints available at http://localhost:3000/api/trpc/*');

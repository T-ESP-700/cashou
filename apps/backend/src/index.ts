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
      return fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: trpcRouter,
        createContext,
        onError: ({ error, type, path, input, ctx, req }) => {
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
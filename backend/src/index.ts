
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return new Response('OK');
    }

    return new Response('Cashou Backend API');
  },
});

console.log(`Backend listening on http://localhost:${server.port}`);

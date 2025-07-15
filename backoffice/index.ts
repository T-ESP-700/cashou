const server = Bun.serve({
  port: 5173,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return new Response('OK');
    }

    return new Response('Cashou Backoffice');
  },
});

console.log(`Backoffice listening on http://localhost:${server.port}`);

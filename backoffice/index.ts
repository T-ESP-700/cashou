import { createServer } from 'http';
import { readFileSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 5173;
const PUBLIC_DIR = join(__dirname, 'dist', 'public');

// Check if build directory exists
const buildExists = existsSync(PUBLIC_DIR);

// MIME types for static files
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // Health check endpoint
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // API endpoints would go here
  if (url.pathname.startsWith('/api')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'API endpoint placeholder' }));
    return;
  }

  // Serve built frontend if available
  if (buildExists) {
    try {
      let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
      const fullPath = join(PUBLIC_DIR, filePath);

      // Try to serve the file
      if (existsSync(fullPath) && statSync(fullPath).isFile()) {
        const ext = extname(fullPath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const content = readFileSync(fullPath);
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      }

      // For SPA routing, serve index.html for non-file paths
      if (!filePath.includes('.')) {
        const indexPath = join(PUBLIC_DIR, 'index.html');
        if (existsSync(indexPath)) {
          const content = readFileSync(indexPath);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
          return;
        }
      }
    } catch (error) {
      console.error('Error serving file:', error);
    }
  }

  // Fallback message if build doesn't exist
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head>
        <title>Cashou Backoffice</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
          }
          h1 { color: #667eea; margin-bottom: 1rem; }
          code {
            background: #f3f4f6;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            display: block;
            margin: 1rem 0;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎮 Cashou Backoffice</h1>
          <p>Build the frontend to see the admin interface:</p>
          <code>cd backoffice && npm run build</code>
          <p style="margin-top: 2rem; color: #666;">
            Or run in development mode:<br/>
            <code>npm run dev:frontend</code>
          </p>
        </div>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`🚀 Backoffice server listening on http://localhost:${PORT}`);
  if (buildExists) {
    console.log(`✅ Serving built frontend from ${PUBLIC_DIR}`);
  } else {
    console.log(`⚠️  Frontend not built yet. Run 'npm run build' to build the frontend.`);
    console.log(`💡 Or use 'npm run dev:frontend' for development with hot reload.`);
  }
});

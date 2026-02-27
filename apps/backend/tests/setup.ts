import { startServer, serverInstance } from '../src/index';

// Use port 3001 for tests to avoid conflicts with Docker backend on 3000
const TEST_PORT = process.env.TEST_PORT || '3001';

// Helper function to wait for server to be ready
export async function waitForServer(url: string, maxRetries = 30, delay = 100): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Server not ready after ${maxRetries * delay}ms`);
}

type ServerType = Awaited<ReturnType<typeof startServer>>;

// Promise-based singleton to prevent race conditions between test files
let serverPromise: Promise<ServerType> | null = null;

export async function ensureServerStarted(): Promise<ServerType> {
  if (!serverPromise && !serverInstance) {
    serverPromise = (async () => {
      process.env.TEST_PORT = TEST_PORT;
      const server = await startServer();
      await waitForServer(`http://localhost:${TEST_PORT}/health`);
      return server;
    })();
  }
  if (serverPromise) {
    return serverPromise;
  }
  if (serverInstance) {
    return serverInstance;
  }
  throw new Error('Server is not available');
}

export async function stopServer() {
  const server = serverPromise ? await serverPromise : null;
  if (server && server.stop) {
    server.stop();
    serverPromise = null;
  }
}

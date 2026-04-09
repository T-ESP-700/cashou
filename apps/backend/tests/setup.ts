import { startServer, serverInstance } from '../src/index';

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
let server: ServerType | null = null;

export async function ensureServerStarted(): Promise<ServerType> {
  if (!server && !serverInstance) {
    server = await startServer();
    await waitForServer('http://localhost:3000/health');
  }
  return (server || serverInstance)!;
}

export async function stopServer() {
  if (server && server.stop) {
    server.stop();
    server = null;
  }
}


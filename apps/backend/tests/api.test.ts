import { describe, it, expect, beforeAll } from 'bun:test';
import { ensureServerStarted } from './setup';

type ServerInstance = Awaited<ReturnType<typeof startServer>>;

// Use port 3001 for tests to avoid conflicts with Docker backend on 3000
const TEST_PORT = process.env.TEST_PORT || '3001';
const TEST_URL = `http://localhost:${TEST_PORT}`;

describe('API Routes Tests', () => {
  beforeAll(async () => {
    // Start the server using shared setup
    await ensureServerStarted();
  });

  describe('Health Check', () => {
    it('should return OK for health endpoint', async () => {
      const response = await fetch(`${TEST_URL}/health`);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('OK');
    });
  });

  describe('Default Route', () => {
    it('should return default message for root path', async () => {
      const response = await fetch(`${TEST_URL}/`);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('Cashou Backend API');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await fetch(`${TEST_URL}/health`);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy();
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await fetch(`${TEST_URL}/health`, {
        method: 'OPTIONS'
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Unknown Routes', () => {
    it('should return default message for unknown routes', async () => {
      const response = await fetch(`${TEST_URL}/unknown-route`);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('Cashou Backend API');
    });
  });
});

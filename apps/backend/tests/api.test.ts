import { describe, it, expect, beforeAll } from 'bun:test';
import { ensureServerStarted } from './setup';

describe('API Routes Tests', () => {
  beforeAll(async () => {
    // Start the server using shared setup
    await ensureServerStarted();
  });

  describe('Health Check', () => {
    it('should return OK for health endpoint', async () => {
      const response = await fetch('http://localhost:3000/health');
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('OK');
    });
  });

  describe('Default Route', () => {
    it('should return default message for root path', async () => {
      const response = await fetch('http://localhost:3000/');
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('Cashou Backend API');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await fetch('http://localhost:3000/health');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy();
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await fetch('http://localhost:3000/health', {
        method: 'OPTIONS'
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Unknown Routes', () => {
    it('should return default message for unknown routes', async () => {
      const response = await fetch('http://localhost:3000/unknown-route');
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('Cashou Backend API');
    });
  });
});

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEV_PORT = 3000;

/**
 * Détecte automatiquement l'hôte du backend en développement :
 * - IP du serveur de dev injectée par Expo (hostUri),
 * - sinon 10.0.2.2 (émulateur Android) ou localhost (simulateur iOS).
 */
function getDevBackendHost(): string {
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (debuggerHost) return debuggerHost;
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

/** Extrait `scheme://host[:port]` sans dépendre de l'implémentation URL de RN. */
function originOf(url: string): string {
  const match = url.match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : url;
}

/**
 * Bases d'URL résolues selon l'environnement.
 * - Prod : dérivées de EXPO_PUBLIC_API_URL (injectée au build), en https/wss SANS port.
 * - Dev : auto-détection de l'hôte LAN via Expo, http/ws sur le port 3000.
 *
 * Le domaine de prod n'est donc PLUS codé en dur : il vient du `.env` au build.
 */
function resolveBases(): { http: string; ws: string } {
  if (!__DEV__) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL; // ex: https://api.exemple.com/api/trpc
    if (envUrl) {
      const origin = originOf(envUrl); // https://api.exemple.com
      return { http: origin, ws: origin.replace(/^http/i, 'ws') }; // http→ws, https→wss
    }
    // En prod, l'URL DOIT être injectée au build : on le signale plutôt que de masquer l'erreur.
    console.warn('[api-config] EXPO_PUBLIC_API_URL manquante en production');
    return { http: 'https://localhost', ws: 'wss://localhost' };
  }
  const host = getDevBackendHost();
  return { http: `http://${host}:${DEV_PORT}`, ws: `ws://${host}:${DEV_PORT}` };
}

const bases = resolveBases();

/** Origine HTTP du backend (`scheme://host[:port]`), ex. pour POST /api/ws-ticket. */
export function getApiBaseUrl(): string {
  return bases.http;
}

/** Origine WebSocket du backend (`ws(s)://host[:port]`). */
export function getWsBaseUrl(): string {
  return bases.ws;
}

export const API_URL = `${bases.http}/api/trpc`;
export const AUTH_URL = `${bases.http}/api/auth`;

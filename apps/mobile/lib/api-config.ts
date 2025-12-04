import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PORT = 3000;

/**
 * Détecte automatiquement l'hôte du backend en développement.
 * - Utilise l'IP détectée par Expo via hostUri
 * - Fallback sur 10.0.2.2 pour émulateur Android
 * - Fallback sur localhost pour simulateur iOS
 */
export function getBackendHost(): string {
  if (!__DEV__) {
    return 'api.cashou.com'; // URL de production
  }

  // Expo injecte l'IP du serveur de dev dans hostUri (format: "192.168.1.14:8081")
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];

  if (debuggerHost) {
    return debuggerHost;
  }

  // Fallbacks selon la plateforme
  if (Platform.OS === 'android') {
    return '10.0.2.2'; // Adresse spéciale pour accéder à localhost depuis émulateur Android
  }

  return 'localhost'; // iOS Simulator
}

export const API_URL = `http://${getBackendHost()}:${PORT}/api/trpc`;
export const AUTH_URL = `http://${getBackendHost()}:${PORT}/api/auth`;

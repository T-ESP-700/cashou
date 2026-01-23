import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'cashou_auth_token';
const LEGACY_TOKEN_KEY = 'cashou_auth_token'; // Same key for migration

/**
 * Secure token storage using expo-secure-store
 * - iOS: Keychain (encrypted)
 * - Android: KeyStore (encrypted)
 * - Web: Falls back to AsyncStorage (for Expo Web)
 */
export const tokenStorage = {
  /**
   * Get the authentication token
   * Attempts to migrate from AsyncStorage if token exists there (legacy)
   */
  async getToken(): Promise<string | null> {
    try {
      // Web doesn't support SecureStore
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(TOKEN_KEY);
      }

      // Try to get from SecureStore first
      let token = await SecureStore.getItemAsync(TOKEN_KEY);

      // Migration: Check if token exists in old AsyncStorage location
      if (!token) {
        const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
        if (legacyToken) {
          console.log('[TokenStorage] Migrating token from AsyncStorage to SecureStore');
          // Migrate to SecureStore
          await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
          // Remove from AsyncStorage
          await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
          token = legacyToken;
        }
      }

      return token;
    } catch (error) {
      console.error('[TokenStorage] Error getting token:', error);
      return null;
    }
  },

  /**
   * Store the authentication token securely
   */
  async setToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        return;
      }

      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('[TokenStorage] Error setting token:', error);
      throw error;
    }
  },

  /**
   * Remove the authentication token
   */
  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(TOKEN_KEY);
        return;
      }

      await SecureStore.deleteItemAsync(TOKEN_KEY);
      // Also clean up any legacy AsyncStorage token
      await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch (error) {
      console.error('[TokenStorage] Error removing token:', error);
    }
  },

  /**
   * Check if a token exists (without reading it)
   */
  async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && token.length > 0;
  },
};

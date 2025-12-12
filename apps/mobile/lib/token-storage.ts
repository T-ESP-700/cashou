import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'cashou_auth_token';

export const tokenStorage = {
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};

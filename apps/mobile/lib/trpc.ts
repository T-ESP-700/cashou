import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@cashou/api/types';
import { tokenStorage } from './token-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3000/api/trpc';

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
      async headers() {
        const token = await tokenStorage.getToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

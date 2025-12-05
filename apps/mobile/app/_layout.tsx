import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';
import { useFonts } from 'expo-font';
import {
  Rowdies_300Light,
  Rowdies_400Regular,
  Rowdies_700Bold,
} from '@expo-google-fonts/rowdies';
import {
  Roboto_400Regular,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { HeaderProvider, useHeader } from '@/hooks/use-header';
import { CashouHeader } from '@/components/cashou-header';
import { CashouTheme } from '@/constants/cashou-theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootNavigatorContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { options: headerOptions } = useHeader();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  // Show loading screen while checking authentication or navigation not ready
  if (isLoading || !navigationState?.key) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const inAuthGroup = segments[0] === 'auth';
  const inTabs = segments[0] === '(tabs)';
  const inGame = segments[0] === 'game';
  const isInitialRoute = segments.length === 0;

  console.log('[RootNavigator] segments:', segments, 'isAuthenticated:', isAuthenticated);

  // Handle redirects BEFORE rendering Stack
  // Case 1: Not authenticated and trying to access protected routes (tabs, game, or initial load)
  if (!isAuthenticated && (inTabs || inGame || isInitialRoute)) {
    console.log('[RootNavigator] Not authenticated, redirecting to /auth');
    return <Redirect href="/auth" />;
  }

  // Case 2: Authenticated but on auth screen
  if (isAuthenticated && inAuthGroup) {
    console.log('[RootNavigator] Authenticated, redirecting to /(tabs)');
    return <Redirect href="/(tabs)" />;
  }

  // Show header for authenticated routes (tabs and game)
  const showHeader = isAuthenticated && (inTabs || inGame);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {showHeader && (
        <CashouHeader
          showBackButton={headerOptions.showBackButton}
          onMenuPress={headerOptions.onMenuPress}
          onBackPress={headerOptions.onBackPress}
        />
      )}
      <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1 } }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="game" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
    </View>
  );
}

function RootNavigator() {
  return (
    <HeaderProvider>
      <RootNavigatorContent />
    </HeaderProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Rowdies: Rowdies_400Regular,
    'Rowdies-Light': Rowdies_300Light,
    'Rowdies-Bold': Rowdies_700Bold,
    Roboto: Roboto_400Regular,
    'Roboto-Bold': Roboto_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

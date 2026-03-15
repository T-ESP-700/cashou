import { LogBox } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

// Suppress expo-notifications warning in Expo Go (remote notifications removed in SDK 53)
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  Rowdies_300Light,
  Rowdies_400Regular,
  Rowdies_700Bold,
} from '@expo-google-fonts/rowdies';
import {
  Roboto_400Regular,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import {
  Anybody_400Regular,
} from '@expo-google-fonts/anybody';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { HeaderProvider, useHeader } from '@/hooks/use-header';
import { NotificationProvider } from '@/hooks/use-notifications';
import { ThemePreferenceProvider, useThemePreference } from '@/hooks/use-theme-provider';
import { CashouHeader } from '@/components/cashou-header';
import { EventNotificationModal } from '@/components/event-notification-modal';
import { GameEndNotificationHandler } from '@/components/game-end-notification-handler';
import { CashouTheme } from '@/constants/cashou-theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootNavigatorContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { options: headerOptions } = useHeader();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { isDark } = useThemePreference();
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
  // const isInitialRoute = (segments as string[]).length === 0;

  console.log('[RootNavigator] segments:', segments, 'isAuthenticated:', isAuthenticated);

  // Handle redirects BEFORE rendering Stack
  if (!isAuthenticated && (inTabs || inGame)) {
    console.log('[RootNavigator] Not authenticated, redirecting to /auth');
    return <Redirect href="/auth" />;
  }

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
          title={headerOptions.title}
          subtitle={headerOptions.subtitle}
          showBackButton={headerOptions.showBackButton}
          onTitlePress={headerOptions.onTitlePress}
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

function RootLayoutInner() {
  const { isDark } = useThemePreference();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <RootNavigator />
      <EventNotificationModal />
      <GameEndNotificationHandler />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Rowdies: Rowdies_400Regular,
    'Rowdies-Light': Rowdies_300Light,
    'Rowdies-Bold': Rowdies_700Bold,
    Roboto: Roboto_400Regular,
    'Roboto-Bold': Roboto_700Bold,
    Anybody: Anybody_400Regular,
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemePreferenceProvider>
        <AuthProvider>
          <NotificationProvider>
            <BottomSheetModalProvider>
              <RootLayoutInner />
            </BottomSheetModalProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}

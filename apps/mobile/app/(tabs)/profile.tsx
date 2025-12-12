import React from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, useColorScheme as useRNColorScheme } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { UserProfile } from '@/components/auth/user-profile';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderOptions } from '@/hooks/use-header';
import { CashouTheme } from '@/constants/cashou-theme';

export default function ProfileScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  // Configure header for this screen
  useHeaderOptions({ showBackButton: false });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </ThemedView>
      </View>
    );
  }

  // If not authenticated, show empty screen while RootNavigator handles redirect
  // This prevents double redirects and loops
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]} />
    );
  }

  // Show user profile
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <UserProfile />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
});

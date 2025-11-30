import React from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, useColorScheme as useRNColorScheme } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { UserProfile } from '@/components/auth/user-profile';
import { useAuth } from '@/hooks/use-auth';
import { CashouHeader } from '@/components/cashou-header';
import { CashouTheme } from '@/constants/cashou-theme';

export default function ProfileScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <CashouHeader
          showBackButton={false}
          onMenuPress={() => console.log('Menu pressed')}
        />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </ThemedView>
      </View>
    );
  }

  // If not authenticated, the root navigator will redirect to auth screen
  // But we show a fallback just in case
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <CashouHeader
          showBackButton={false}
          onMenuPress={() => console.log('Menu pressed')}
        />
        <ThemedView style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Redirecting...</ThemedText>
        </ThemedView>
      </View>
    );
  }

  // Show user profile
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CashouHeader
        showBackButton={false}
        onMenuPress={() => console.log('Menu pressed')}
      />
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

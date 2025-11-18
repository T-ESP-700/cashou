import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';
import { UserProfile } from '@/components/auth/user-profile';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  // Show user profile if authenticated
  if (isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <UserProfile />
        </ScrollView>
      </ThemedView>
    );
  }

  // Show login/signup forms if not authenticated
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Welcome to Cashou
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Your gamified financial education platform
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'login' && styles.activeTab,
              { borderBottomColor: activeTab === 'login' ? colors.tint : 'transparent' }
            ]}
            onPress={() => setActiveTab('login')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'login' && styles.activeTabText,
                { color: activeTab === 'login' ? colors.tint : colors.text }
              ]}
            >
              Login
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'signup' && styles.activeTab,
              { borderBottomColor: activeTab === 'signup' ? colors.tint : 'transparent' }
            ]}
            onPress={() => setActiveTab('signup')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'signup' && styles.activeTabText,
                { color: activeTab === 'signup' ? colors.tint : colors.text }
              ]}
            >
              Sign Up
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.formContainer}>
          {activeTab === 'login' ? (
            <LoginForm onSuccess={refreshUser} />
          ) : (
            <SignupForm onSuccess={refreshUser} />
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
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
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    marginBottom: 8,
  },
  headerSubtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  activeTab: {
    // Active tab styles are applied via borderBottomColor
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '700',
  },
  formContainer: {
    flex: 1,
  },
});

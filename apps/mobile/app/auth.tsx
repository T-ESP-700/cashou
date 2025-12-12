import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View, KeyboardAvoidingView, Platform, useColorScheme as useRNColorScheme } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';
import { useAuth } from '@/hooks/use-auth';
import { CashouTheme } from '@/constants/cashou-theme';

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const { refreshUser } = useAuth();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle}>
              Welcome to Cashou
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Your gamified financial education platform
            </ThemedText>
          </ThemedView>

          <ThemedView style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'login' && styles.activeTab,
                { borderBottomColor: activeTab === 'login' ? theme.accent : 'transparent' }
              ]}
              onPress={() => setActiveTab('login')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === 'login' && styles.activeTabText,
                  { color: activeTab === 'login' ? theme.accent : theme.text }
                ]}
              >
                Login
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'signup' && styles.activeTab,
                { borderBottomColor: activeTab === 'signup' ? theme.accent : 'transparent' }
              ]}
              onPress={() => setActiveTab('signup')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === 'signup' && styles.activeTabText,
                  { color: activeTab === 'signup' ? theme.accent : theme.text }
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
    </KeyboardAvoidingView>
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

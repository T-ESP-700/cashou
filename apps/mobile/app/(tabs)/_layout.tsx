import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { CashouTheme } from '@/constants/cashou-theme';

export default function TabLayout() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: isDark ? '#9BA1A6' : '#687076',
        tabBarStyle: {
          backgroundColor: theme.primary,
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="remove-outline" size={size || 28} color={isDark ? '#FFFFFF' : '#1C1E33'} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Quiz',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="help-circle-outline" size={size || 28} color={isDark ? '#FFFFFF' : '#1C1E33'} />
          ),
        }}
      />
      <Tabs.Screen
        name="test"
        options={{
          title: 'Test',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flask-outline" size={size || 28} color={isDark ? '#FFFFFF' : '#1C1E33'} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="logo-usd" size={size || 28} color={isDark ? '#FFFFFF' : '#1C1E33'} />
          ),
          href: null, // Hide for now as route doesn't exist yet
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size || 28} color={isDark ? '#FFFFFF' : '#1C1E33'} />
          ),
          href: null, // Hide for now as route doesn't exist yet
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size || 28} color={isDark ? '#FFFFFF' : '#1C1E33'} />
          ),
        }}
      />
    </Tabs>
  );
}

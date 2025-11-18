import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme as useRNColorScheme, View } from 'react-native';
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
          tabBarIcon: ({ size, focused }) => (
            <View style={focused ? { backgroundColor: '#E87F00', borderRadius: 12, padding: 8 } : { padding: 8 }}>
              <Ionicons name={(focused ? "home" : "home-outline") as any} size={size || 28} color="#1C1E33" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="test"
        options={{
          title: 'Test',
          tabBarIcon: ({ size, focused }) => (
            <View style={focused ? { backgroundColor: '#E87F00', borderRadius: 12, padding: 8 } : { padding: 8 }}>
              <Ionicons name={(focused ? "flask" : "flask-outline") as any} size={size || 28} color="#1C1E33" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ size, focused }) => (
            <View style={focused ? { backgroundColor: '#E87F00', borderRadius: 12, padding: 8 } : { padding: 8 }}>
              <Ionicons name="logo-usd" size={size || 28} color="#1C1E33" />
            </View>
          ),
          href: null, // Hide for now as route doesn't exist yet
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ size, focused }) => (
            <View style={focused ? { backgroundColor: '#E87F00', borderRadius: 12, padding: 8 } : { padding: 8 }}>
              <Ionicons name={(focused ? "book" : "book-outline") as any} size={size || 28} color="#1C1E33" />
            </View>
          ),
          href: null, // Hide for now as route doesn't exist yet
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Account',
          tabBarIcon: ({ size, focused }) => (
            <View style={focused ? { backgroundColor: '#E87F00', borderRadius: 12, padding: 8 } : { padding: 8 }}>
              <Ionicons name={(focused ? "person" : "person-outline") as any} size={size || 28} color="#1C1E33" />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

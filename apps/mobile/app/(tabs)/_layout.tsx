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
          paddingTop: 12,
          paddingBottom: 12,
          height: 80,
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
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    backgroundColor: '#E87F00',
                    borderRadius: 14,
                    width: size + 20,
                    height: size + 20,
                  }}
                />
              )}
              <Ionicons
                name={(focused ? "home" : "home-outline") as any}
                size={size}
                color="#FFFFFF"
                style={{ opacity: focused ? 1 : 0.6 }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ size, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    backgroundColor: '#E87F00',
                    borderRadius: 14,
                    width: size + 20,
                    height: size + 20,
                  }}
                />
              )}
              <Ionicons
                name="logo-usd"
                size={size}
                color="#FFFFFF"
                style={{ opacity: focused ? 1 : 0.6 }}
              />
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
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    backgroundColor: '#E87F00',
                    borderRadius: 14,
                    width: size + 20,
                    height: size + 20,
                  }}
                />
              )}
              <Ionicons
                name={(focused ? "book" : "book-outline") as any}
                size={size}
                color="#FFFFFF"
                style={{ opacity: focused ? 1 : 0.6 }}
              />
            </View>
          ),
          href: null, // Hide for now as route doesn't exist yet
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ size, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    backgroundColor: '#E87F00',
                    borderRadius: 14,
                    width: size + 20,
                    height: size + 20,
                  }}
                />
              )}
              <Ionicons
                name={(focused ? "person" : "person-outline") as any}
                size={size}
                color="#FFFFFF"
                style={{ opacity: focused ? 1 : 0.6 }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="game-history"
        options={{
          title: 'Game',
          tabBarIcon: ({ size, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    backgroundColor: '#E87F00',
                    borderRadius: 14,
                    width: size + 20,
                    height: size + 20,
                  }}
                />
              )}
              <Ionicons
                name={(focused ? "game-controller" : "game-controller-outline") as any}
                size={size}
                color="#FFFFFF"
                style={{ opacity: focused ? 1 : 0.6 }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="daily-quiz"
        options={{
          href: null, // Masquer de la tab bar
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null, // Masquer de la tab bar
        }}
      />
    </Tabs>
  );
}

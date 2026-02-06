import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { useColorScheme as useRNColorScheme, View, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { CashouTheme } from '@/constants/cashou-theme';

const TAB_BAR_HEIGHT = 74;
const TAB_BAR_MARGIN_HORIZONTAL = 40;
const TAB_BAR_MARGIN_BOTTOM = 28;

export default function TabLayout() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Pages liées à l'historique de jeu (la manette doit être en focus)
  const isGameHistoryRelated = pathname === '/game-history' || pathname === '/summary';

  const bottomMargin = Math.max(TAB_BAR_MARGIN_BOTTOM, insets.bottom + 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1C1E33",
        tabBarInactiveTintColor: "rgba(0, 0, 0, 0.4)",
        tabBarStyle: {
          position: "absolute",
          bottom: bottomMargin,
          left: TAB_BAR_MARGIN_HORIZONTAL,
          right: TAB_BAR_MARGIN_HORIZONTAL,
          width: undefined,
          height: TAB_BAR_HEIGHT,
          backgroundColor: theme.primary,
          borderRadius: TAB_BAR_HEIGHT / 2,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.06)",
          paddingVertical: 8,
          paddingHorizontal: 8,
          marginHorizontal: 16,
          justifyContent: 'center',
          alignItems: 'center',
          // ...Platform.select({
          //   ios: {
          //     shadowColor: "#000",
          //     shadowOffset: { width: 0, height: 4 },
          //     shadowOpacity: 0.15,
          //     shadowRadius: 16,
          //   },
          //   android: {
          //     elevation: 8,
          //   },
          // }),
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ size, focused }) => (
            <View
              className="items-center justify-center flex-1"
              style={{
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {focused && (
                <View
                  className="flex rounded-xl bg-white/90"
                  style={{
                    width: 48,
                    height: 48,
                    alignSelf: 'center',
                    // position: 'absolute',
                    // zIndex: 0,
                  }}
                />
              )}
              <Ionicons
                name={(focused ? "home" : "home-outline") as any}
                size={22}
                color="#1C1E33"
                style={{ opacity: focused ? 1 : 0.45, zIndex: 1 }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ size, focused }) => (
            <View
              className="items-center justify-center flex-1"
              style={{
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {focused && (
                <View
                  className={`rounded-xl ${
                    isDark ? "bg-white/90" : "bg-white/90"
                  }`}
                  style={{
                    position: 'absolute',
                    width: 48,
                    height: 48,
                    zIndex: 0,
                  }}
                />
              )}
              <Ionicons
                name="logo-usd"
                size={22}
                color="#1C1E33"
                style={{ opacity: focused ? 1 : 0.45, zIndex: 1 }}
              />
            </View>
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ size, focused }) => (
            <View
              className="items-center justify-center flex-1"
              style={{
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {focused && (
                <View
                  className={`rounded-xl ${
                    isDark ? "bg-white/90" : "bg-white/90"
                  }`}
                  style={{
                    position: 'absolute',
                    width: 48,
                    height: 48,
                    zIndex: 0,
                  }}
                />
              )}
              <Ionicons
                name={(focused ? "book" : "book-outline") as any}
                size={22}
                color="#1C1E33"
                style={{ opacity: focused ? 1 : 0.45, zIndex: 1 }}
              />
            </View>
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="dico"
        options={{
          title: "Dico",
          tabBarIcon: ({ size, focused }) => (
            <View
              className="items-center justify-center flex-1"
              style={{
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {focused && (
                <View
                  className={`rounded-xl ${
                    isDark ? "bg-white/90" : "bg-white/90"
                  }`}
                  style={{
                    position: 'absolute',
                    width: 48,
                    height: 48,
                    zIndex: 0,
                  }}
                />
              )}
              <Ionicons
                name={(focused ? "book" : "book-outline") as any}
                size={22}
                color="#1C1E33"
                style={{ opacity: focused ? 1 : 0.45, zIndex: 1 }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Account",
          tabBarIcon: ({ size, focused }) => (
            <View
              className="items-center justify-center flex-1"
              style={{
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {focused && (
                <View
                  className={`rounded-xl ${
                    isDark ? "bg-white/90" : "bg-white/90"
                  }`}
                  style={{
                    position: 'absolute',
                    width: 48,
                    height: 48,
                    zIndex: 0,
                  }}
                />
              )}
              <Ionicons
                name={(focused ? "person" : "person-outline") as any}
                size={22}
                color="#1C1E33"
                style={{ opacity: focused ? 1 : 0.45, zIndex: 1 }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="game-history"
        options={{
          title: "Game",
          tabBarIcon: ({ size }) => {
            const isFocused = isGameHistoryRelated;
            return (
              <View
                className="items-center justify-center flex-1"
                style={{
                  height: TAB_BAR_HEIGHT,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {isFocused && (
                  <View
                    className={`rounded-xl ${
                      isDark ? "bg-white/90" : "bg-white/90"
                    }`}
                    style={{
                      position: 'absolute',
                      width: 48,
                      height: 48,
                      zIndex: 0,
                    }}
                  />
                )}
                <Ionicons
                  name={
                    (isFocused
                      ? "game-controller"
                      : "game-controller-outline") as any
                  }
                  size={22}
                  color="#1C1E33"
                  style={{ opacity: isFocused ? 1 : 0.45, zIndex: 1 }}
                />
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="daily-quiz"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

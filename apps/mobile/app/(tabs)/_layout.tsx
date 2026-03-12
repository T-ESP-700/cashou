
import { Tabs, usePathname } from 'expo-router';
import { BottomTabBarProps , BottomTabBar } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { CashouTheme } from '@/constants/cashou-theme';
import { useThemePreference } from '@/hooks/use-theme-provider';

import TabHome from '@/assets/images/tab-home.svg';
import TabDico from '@/assets/images/tab-dico.svg';
import TabProfil from '@/assets/images/tab-profil.svg';
import TabHistory from '@/assets/images/tab-history.svg';

const TAB_BAR_HEIGHT = 74;
const TAB_BAR_MARGIN_HORIZONTAL = 40;
const TAB_BAR_MARGIN_BOTTOM = 28;

const ICON_SIZE = 28;
const ICON_STROKE_WIDTH = 3;

export default function TabLayout() {
  const { isDark } = useThemePreference();
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const insets = useSafeAreaInsets();

  const focusedIconColor = isDark ? '#FFFFFF' : '#172D4E';
  const unfocusedIconColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';

  const bottomMargin = Platform.OS === 'ios'
    ? Math.max(TAB_BAR_MARGIN_BOTTOM, insets.bottom - 8)
    : Math.max(TAB_BAR_MARGIN_BOTTOM, insets.bottom + 8);

  const renderTabIcon = (SvgIcon: React.FC<any>, focused: boolean) => (
    <View
      style={{
        flex: 1,
        alignSelf: 'stretch',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 9999,
        backgroundColor: focused ? (isDark ? theme.accent : '#FFFFFF') : 'transparent',
      }}
    >
      <SvgIcon
        width={ICON_SIZE}
        height={ICON_SIZE}
        color={focused ? focusedIconColor : unfocusedIconColor}
        strokeWidth={ICON_STROKE_WIDTH}
      />
    </View>
  );

  return (

    <Tabs
      tabBar={(props: BottomTabBarProps) => (
        <View>
          {/* Overlay: from mid-tabbar down to screen bottom */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: bottomMargin + TAB_BAR_HEIGHT / 2,
              backgroundColor: theme.background,
              opacity: 0.85,
            }}
          />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#FFFFFF' : '#1C1E33',
        tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
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
          borderWidth: 0,
          padding: 2,
          marginHorizontal: 16,
          overflow: 'hidden',
          zIndex: 20,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'stretch',
          height: TAB_BAR_HEIGHT,
          paddingTop: 0,
          paddingBottom: 0,
          borderRadius: 9999,
          overflow: 'hidden',
        },
        tabBarIconStyle: {
          flex: 1,
          width: '100%',
          alignSelf: 'stretch',
          marginTop: 0,
          marginBottom: 0,
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
          tabBarIcon: ({ focused }) => renderTabIcon(TabHome, focused),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ focused }) => renderTabIcon(TabHome, focused),
          href: null,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ focused }) => renderTabIcon(TabDico, focused),
          href: null,
        }}
      />
      <Tabs.Screen
        name="dico"
        options={{
          title: "Dico",
          tabBarIcon: ({ focused }) => renderTabIcon(TabDico, focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Account",
          tabBarIcon: ({ focused }) => renderTabIcon(TabProfil, focused),
        }}
      />
      <Tabs.Screen
        name="game-history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => renderTabIcon(TabHistory, focused),
        }}
      />
      <Tabs.Screen
        name="daily-quiz"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
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
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="levels"
        options={{
          href: null, // Hidden tab, navigated from Profile / Home
        }}
      />
    </Tabs>
  );
}

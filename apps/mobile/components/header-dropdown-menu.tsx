import { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAlert } from '@/hooks/use-alert';
import { useThemePreference } from '@/hooks/use-theme-provider';

interface HeaderDropdownMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItemConfig {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  trailing?: 'chevron' | 'switch';
  switchValue?: boolean;
  destructive?: boolean;
}

export function HeaderDropdownMenu({ visible, onClose }: HeaderDropdownMenuProps) {
  const { colors, isDark, borderRadius } = useCashouTheme();
  const { showAlert } = useAlert();
  const { toggleTheme } = useThemePreference();
  const insets = useSafeAreaInsets();

  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const translateY = useSharedValue(-8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      scale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.back(1.5)) });
      translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.9, { duration: 150 });
      translateY.value = withTiming(-6, { duration: 150 });
    }
  }, [visible, opacity, scale, translateY]);

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  // --- Handlers ---

  const handleNotifications = () => {
    onClose();
    Linking.openSettings();
  };

  const handlePrivacy = async () => {
    onClose();
    await WebBrowser.openBrowserAsync('https://cashou.app', {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: colors.accent,
      toolbarColor: colors.background,
    });
  };

  const handleContact = () => {
    showAlert(
      'Nous contacter',
      "Vous allez ouvrir votre application email pour contacter l'\u00e9quipe Cashou.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer un email',
          onPress: () => {
            onClose();
            Linking.openURL('mailto:contact@cashou.app?subject=Contact%20Cashou');
          },
        },
      ],
    );
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  // --- Menu config ---

  const menuBg = colors.card;
  const subtextColor = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.4)';
  const accentOrange = colors.accent;

  const menuItems: MenuItemConfig[] = [
    {
      icon: isDark ? 'sunny' : 'moon',
      label: isDark ? 'Mode clair' : 'Mode sombre',
      onPress: handleThemeToggle,
      trailing: 'switch',
      switchValue: isDark,
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: handleNotifications,
      trailing: 'chevron',
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Confidentialité',
      onPress: handlePrivacy,
      trailing: 'chevron',
    },
    {
      icon: 'mail-outline',
      label: 'Nous contacter',
      onPress: handleContact,
      trailing: 'chevron',
    },
  ];

  const renderMenuItem = (item: MenuItemConfig, _isLast: boolean) => (
    <TouchableOpacity
      key={item.label}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}
      activeOpacity={0.6}
      onPress={item.onPress}
    >
      <Ionicons
        name={item.icon}
        size={18}
        color={item.destructive ? '#F44336' : accentOrange}
      />
      <Text
        style={{ flex: 1, fontSize: 15, fontFamily: 'Roboto', letterSpacing: 0.1, color: item.destructive ? '#F44336' : colors.text }}
      >
        {item.label}
      </Text>
      {item.trailing === 'switch' && (
        <Switch
          value={item.switchValue}
          onValueChange={item.onPress}
          trackColor={{ false: colors.borderLight, true: accentOrange }}
          thumbColor="#FFFFFF"
          style={{ transform: [{ scale: 0.72 }], marginRight: -4 }}
        />
      )}
      {item.trailing === 'chevron' && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={subtextColor}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ position: 'absolute', top: -20, left: 0, right: 0, bottom: 0 }}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View
        style={[
          {
            position: 'absolute',
            overflow: 'hidden',
            width: 248,
            top: insets.top,
            right: 16,
            transformOrigin: 'top right',
            backgroundColor: menuBg,
            borderRadius: borderRadius.lg,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.18,
                shadowRadius: 20,
              },
              android: {
                elevation: 12,
              },
            }),
          },
          menuAnimatedStyle,
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 }}>
          <Text style={{ fontSize: 17, fontFamily: 'Rowdies', fontWeight: '400', letterSpacing: 0.2, color: colors.text }}>
            Réglages
          </Text>
        </View>

        {menuItems.map((item) => renderMenuItem(item, false))}

        <View style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontFamily: 'Roboto', letterSpacing: 0.3, color: subtextColor }}>
            Cashou v1.0
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

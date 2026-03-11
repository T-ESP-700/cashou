import { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { HeaderDropdownMenu } from '@/components/header-dropdown-menu';

interface CashouHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onTitlePress?: () => void;
  onMenuPress?: () => void;
  onBackPress?: () => void;
}

export function CashouHeader({
  title = 'Cashou',
  subtitle,
  showBackButton = true,
  onTitlePress,
  onMenuPress,
  onBackPress,
}: CashouHeaderProps) {
  const router = useRouter();
  const { colors, isDark } = useCashouTheme();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const iconColor = '#1C1E33';
  const pillBg = '#FFB472';
  const pillBorder = 'rgba(0, 0, 0, 0.06)';
  const pillTextColor = '#1C1E33';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
      ]}
    >
      <View style={styles.row}>
        {/* Back Button */}
        {showBackButton ? (
          <TouchableOpacity
            onPress={handleBackPress}
            activeOpacity={0.7}
            style={[
              styles.floatingButton,
              {
                backgroundColor: pillBg,
                borderColor: pillBorder,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonPlaceholder} />
        )}

        {/* Title Pill */}
        <TouchableOpacity
          disabled={!onTitlePress}
          onPress={onTitlePress}
          activeOpacity={0.7}
          style={[
            styles.titlePill,
            {
              backgroundColor: pillBg,
              borderColor: pillBorder,
            },
          ]}
        >
          <View style={styles.titlePillInner}>
            <View style={styles.titlePillTexts}>
              <Text
                style={[
                  styles.titleText,
                  { color: pillTextColor },
                  subtitle ? { fontSize: 20 } : undefined,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {!!subtitle && (
                <Text
                  style={[styles.subtitleText, { color: pillTextColor }]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              )}
            </View>
            {!!onTitlePress && (
              <Ionicons name="information-circle-outline" size={18} color={pillTextColor} style={{ marginLeft: 6 }} />
            )}
          </View>
        </TouchableOpacity>

        {/* Menu Button */}
        <TouchableOpacity
          onPress={onMenuPress ?? (() => setMenuVisible(true))}
          activeOpacity={0.7}
          style={[
            styles.floatingButton,
            {
              backgroundColor: pillBg,
              borderColor: pillBorder,
            },
          ]}
        >
          <Ionicons name="menu" size={22} color={iconColor} />
        </TouchableOpacity>
      </View>

      <HeaderDropdownMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </View>
  );
}

const BUTTON_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonPlaceholder: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  titlePill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  titlePillInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titlePillTexts: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 24,
    fontFamily: 'Anybody',
    fontWeight: '400',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 12,
    fontFamily: 'Anybody',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 1,
  },
});

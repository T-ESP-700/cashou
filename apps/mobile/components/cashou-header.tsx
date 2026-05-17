import { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { HeaderDropdownMenu } from '@/components/header-dropdown-menu';

// Filled icons on white circle background

function PlayIcon({ size = 40, color = '#1C1E33' }: { size?: number; color?: string }) {
  const inner = size * 0.55;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4.5C7 3.7 7.8 3.2 8.5 3.6L20 10.6C20.7 11 20.7 13 20 13.4L8.5 20.4C7.8 20.8 7 20.3 7 19.5V4.5Z" fill={color} />
      </Svg>
    </View>
  );
}

function PauseIcon({ size = 40, color = '#1C1E33' }: { size?: number; color?: string }) {
  const inner = size * 0.55;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
        <Rect x="5" y="3" width="5" height="18" rx="2" fill={color} />
        <Rect x="14" y="3" width="5" height="18" rx="2" fill={color} />
      </Svg>
    </View>
  );
}

function InfoIcon({ size = 40, color = '#1C1E33' }: { size?: number; color?: string }) {
  const inner = size * 0.55;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
        <Path d="M12 10V21" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
        <Circle cx="12" cy="5" r="2.5" fill={color} />
      </Svg>
    </View>
  );
}

interface CashouHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  isPaused?: boolean;
  dimmed?: boolean;
  onTitlePress?: () => void;
  onMenuPress?: () => void;
  onBackPress?: () => void;
}

export function CashouHeader({
  title = 'Cashou',
  subtitle,
  showBackButton = true,
  isPaused,
  dimmed,
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

  const pillBg = colors.accent;
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const pillTextColor = '#1C1E33';
  const iconColor = pillTextColor;

  const showPlayPause = !!subtitle && isPaused !== undefined;
  const showInfo = !!onTitlePress;

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
              paddingLeft: showInfo ? PILL_PADDING : 16,
              paddingRight: showPlayPause ? PILL_PADDING : 16,
            },
          ]}
        >
          <View style={styles.titlePillInner}>
            {showInfo && (
              <View style={styles.pillIconLeft}>
                <InfoIcon size={PILL_ICON_SIZE} color={pillTextColor} />
              </View>
            )}
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
            {showPlayPause && (
              <View style={styles.pillIconRight}>
                {isPaused
                  ? <PauseIcon size={PILL_ICON_SIZE} color={pillTextColor} />
                  : <PlayIcon size={PILL_ICON_SIZE} color={pillTextColor} />
                }
              </View>
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

      {dimmed && (
        <View
          pointerEvents="none"
          style={[
            styles.dimOverlay,
            { backgroundColor: overlayColor(isDark), top: insets.top + 8 },
          ]}
        />
      )}

    </View>
  );
}

function overlayColor(isDark: boolean): string {
  return isDark ? 'rgba(0,0,0,0.72)' : 'rgba(28,30,51,0.55)';
}

const BUTTON_SIZE = 44;
const TITLE_PILL_HEIGHT = 56;
const PILL_PADDING = 5; // padding between pill edge and icon
const PILL_ICON_SIZE = TITLE_PILL_HEIGHT - PILL_PADDING * 2; // icon fits inside pill with padding

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    borderRadius: 999,
    borderWidth: 1,
    height: TITLE_PILL_HEIGHT,
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
    height: '100%',
  },
  pillIconLeft: {
    marginRight: 8,
  },
  pillIconRight: {
    marginLeft: 8,
  },
  titlePillTexts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  titleText: {
    fontSize: 24,
    fontFamily: 'Anybody',
    fontWeight: '400',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 17,
    fontFamily: 'Anybody',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 1,
  },
});

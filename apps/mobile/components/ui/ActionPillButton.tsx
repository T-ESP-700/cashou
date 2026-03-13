import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ActionPillButtonProps {
  label: string;
  iconName?: IconName;
  customIcon?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  style?: ViewStyle;
}

export function ActionPillButton({
  label,
  iconName,
  customIcon,
  onPress,
  disabled = false,
  isLoading = false,
  style,
}: ActionPillButtonProps) {
  const { colors } = useCashouTheme();
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={StyleSheet.flatten([styles.button, { backgroundColor: colors.accent }, isDisabled && styles.buttonDisabled, style])}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.text} />
      ) : (
        <View style={styles.contentRow}>
          {(customIcon != null || iconName != null) && (
            <View style={styles.iconWrapper}>
              {customIcon ?? (iconName ? <Ionicons name={iconName} size={ICON_SIZE} color={colors.text} /> : null)}
            </View>
          )}
          <Text allowFontScaling={false} style={[styles.label, { color: colors.text }]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const ICON_SIZE = 22;

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 0,
    maxWidth: '100%',
    flexShrink: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 1,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    height: ICON_SIZE,
    minWidth: ICON_SIZE,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  label: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Roboto',
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlignVertical: 'center',
    flexShrink: 1,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
});

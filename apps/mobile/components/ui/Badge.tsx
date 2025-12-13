import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'accent' | 'streak';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  /** Badge text */
  label: string;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Size preset */
  size?: BadgeSize;
  /** Show a dot indicator */
  showDot?: boolean;
  /** Icon to display before text */
  icon?: React.ReactNode;
  /** Additional style */
  style?: ViewStyle;
}

export function Badge({
  label,
  variant = 'accent',
  size = 'md',
  showDot = false,
  icon,
  style,
}: BadgeProps) {
  const { colors, status, special, fonts, borderRadius } = useCashouTheme();

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'success':
        return status.success;
      case 'error':
        return status.error;
      case 'warning':
        return status.warning;
      case 'info':
        return status.info;
      case 'neutral':
        return status.neutral;
      case 'accent':
        return colors.accent;
      case 'streak':
        return special.streak;
      default:
        return colors.accent;
    }
  };

  const getTextColor = (): string => {
    // Most badge backgrounds are colorful, so dark text works best
    switch (variant) {
      case 'error':
      case 'success':
      case 'warning':
      case 'info':
      case 'streak':
        return special.white;
      case 'neutral':
        return special.white;
      case 'accent':
        return special.darkText;
      default:
        return special.darkText;
    }
  };

  const sizeStyles = {
    sm: { paddingHorizontal: 8, paddingVertical: 2, fontSize: 12, dotSize: 6 },
    md: { paddingHorizontal: 12, paddingVertical: 4, fontSize: 14, dotSize: 8 },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: getBackgroundColor(),
          borderRadius: borderRadius.lg,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
          gap: 6,
        },
        style,
      ]}
    >
      {showDot && (
        <View
          style={{
            width: currentSize.dotSize,
            height: currentSize.dotSize,
            borderRadius: currentSize.dotSize / 2,
            backgroundColor: getTextColor(),
          }}
        />
      )}
      {icon && <View>{icon}</View>}
      <Text
        style={{
          color: getTextColor(),
          fontFamily: fonts.body,
          fontSize: currentSize.fontSize,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

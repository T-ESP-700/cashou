import React from 'react';
import { View, ViewProps } from 'react-native';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

export type CardVariant = 'default' | 'elevated' | 'outlined';
export type CardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg';

interface CardProps extends ViewProps {
  /** Visual variant */
  variant?: CardVariant;
  /** Padding preset */
  padding?: CardPadding;
  /** Custom background color (overrides theme) */
  backgroundColor?: string;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  backgroundColor,
  style,
  ...props
}: CardProps) {
  const { colors, spacing, borderRadius, borderWidth, isDark } = useCashouTheme();

  const paddingValue = {
    none: 0,
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  }[padding];

  const getElevationStyle = () => {
    if (variant !== 'elevated') return {};

    return isDark
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 4,
        };
  };

  return (
    <View
      style={[
        {
          backgroundColor: backgroundColor || colors.card,
          borderRadius: borderRadius.lg,
          padding: paddingValue,
        },
        variant === 'outlined' && {
          borderWidth: borderWidth.thin,
          borderColor: colors.border,
        },
        getElevationStyle(),
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  ActivityIndicator,
  View,
} from 'react-native';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  /** Button text */
  title: string;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Icon to display before text */
  leftIcon?: React.ReactNode;
  /** Icon to display after text */
  rightIcon?: React.ReactNode;
  /** Stretch to fill container width */
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors, status, special, fonts, borderRadius } = useCashouTheme();

  const getBackgroundColor = (): string => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary':
        return colors.accent;
      case 'secondary':
        return colors.card;
      case 'outline':
        return 'transparent';
      case 'danger':
        return status.error;
      case 'success':
        return status.success;
      case 'ghost':
        return 'transparent';
      default:
        return colors.accent;
    }
  };

  const getTextColor = (): string => {
    if (disabled) return special.white;
    switch (variant) {
      case 'primary':
        return special.darkText;
      case 'secondary':
        return colors.text;
      case 'outline':
        return colors.text;
      case 'danger':
        return special.white;
      case 'success':
        return special.white;
      case 'ghost':
        return colors.text;
      default:
        return special.white;
    }
  };

  const getBorderColor = (): string => {
    switch (variant) {
      case 'outline':
        return colors.border;
      case 'danger':
        return status.errorDark;
      default:
        return 'transparent';
    }
  };

  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: 12, fontSize: 14, gap: 6 },
    md: { height: 50, paddingHorizontal: 16, fontSize: 16, gap: 8 },
    lg: { height: 56, paddingHorizontal: 24, fontSize: 18, gap: 10 },
  };

  const currentSize = sizeStyles[size];
  const hasBorder = variant === 'outline';

  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: hasBorder ? 1 : 0,
          borderRadius: borderRadius.sm,
          height: currentSize.height,
          paddingHorizontal: currentSize.paddingHorizontal,
          gap: currentSize.gap,
          opacity: disabled ? 0.6 : 1,
        },
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {leftIcon && <View>{leftIcon}</View>}
          <Text
            style={{
              color: getTextColor(),
              fontSize: currentSize.fontSize,
              fontFamily: fonts.subheading,
              fontWeight: '600',
            }}
          >
            {title}
          </Text>
          {rightIcon && <View>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}

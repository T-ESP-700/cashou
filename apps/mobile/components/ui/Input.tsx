import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Label displayed above input */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text displayed below input */
  helperText?: string;
  /** Icon to display on the left */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right */
  rightIcon?: React.ReactNode;
  /** If true, shows a password toggle button */
  isPassword?: boolean;
  /** Additional style for container */
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  isPassword = false,
  containerStyle,
  editable = true,
  ...props
}: InputProps) {
  const { colors, status, fonts, spacing, borderRadius, borderWidth } = useCashouTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error
    ? status.error
    : isFocused
      ? colors.accent
      : colors.border;
  const placeholderColor = colors.text + '60';

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            color: error ? status.error : colors.text,
            fontFamily: fonts.body,
            fontSize: 14,
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderColor,
          borderWidth: borderWidth.thin,
          borderRadius: borderRadius.sm,
          height: 50,
          paddingHorizontal: spacing.md,
          opacity: editable ? 1 : 0.6,
        }}
      >
        {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
        <TextInput
          style={{
            flex: 1,
            height: '100%',
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 16,
          }}
          placeholderTextColor={placeholderColor}
          editable={editable}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={{ marginLeft: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.icon}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
      </View>
      {error && (
        <Text
          style={{
            color: status.error,
            fontFamily: fonts.body,
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text
          style={{
            color: colors.icon,
            fontFamily: fonts.body,
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
}

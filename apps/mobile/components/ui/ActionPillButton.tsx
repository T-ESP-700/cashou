import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
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
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          {customIcon ?? (iconName ? <Ionicons name={iconName} size={17} color={colors.text} /> : null)}
          <Text allowFontScaling={false} style={[styles.label, { color: colors.text }]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    borderRadius: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Roboto',
    paddingHorizontal: 0,
  },
});

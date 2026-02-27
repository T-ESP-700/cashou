import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={StyleSheet.flatten([styles.button, isDisabled && styles.buttonDisabled, { flex: 1 }, style])}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#1C2440" />
      ) : (
        <>
          {customIcon ?? (iconName ? <Ionicons name={iconName} size={17} color="#1C2440" /> : null)}
          <Text allowFontScaling={false} style={styles.label}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    maxWidth: 100,
    height: 44,
    borderRadius: 80,
    backgroundColor: '#F7B167',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 0,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  label: {
    fontSize: 18,
    color: '#1C2440',
    fontFamily: 'Roboto',
    paddingHorizontal: 0,
  },
});

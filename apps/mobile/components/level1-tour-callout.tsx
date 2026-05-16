import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

interface Level1TourCalloutProps {
  title: string;
  message: string;
}

/**
 * High-contrast tutoriel strip for in-sheet / asset-detail / transaction flows.
 */
export function Level1TourCallout({ title, message }: Level1TourCalloutProps) {
  const { colors, fonts, borderRadius, isDark } = useCashouTheme();
  const accent = colors.accent;
  const bg = isDark ? `${accent}18` : `${accent}14`;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: bg,
          borderColor: accent,
          borderRadius: borderRadius.lg,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${accent}33` }]}>
        <Ionicons name="school" size={22} color={accent} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.subheading }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.text, fontFamily: fonts.body, opacity: 0.95 }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: 2,
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
});

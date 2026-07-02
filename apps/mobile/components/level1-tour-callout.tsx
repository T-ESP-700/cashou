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
  const { colors, fonts, borderRadius } = useCashouTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: borderRadius.lg,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${colors.text}10` }]}>
        <Ionicons name="school" size={22} color={colors.text} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.body }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.text, fontFamily: fonts.body }]}>
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
    borderWidth: 1,
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
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
});

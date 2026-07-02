import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

interface TutorialBubbleProps {
  message: string;
  title?: string;
}

export function TutorialBubble({ message, title }: TutorialBubbleProps) {
  const { colors, fonts, borderRadius } = useCashouTheme();
  return (
    <View
      style={[
        styles.bubble,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.lg },
      ]}
    >
      {title && (
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.body }]}>{title}</Text>
      )}
      <Text style={[styles.text, { color: colors.text, fontFamily: fonts.body }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    padding: 14,
    borderWidth: 1,
    maxWidth: '100%',
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});

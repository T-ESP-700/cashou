import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

interface Level1TourCoachBubbleProps {
  message: string;
  /** 'down' = bulle au-dessus de la cible (défaut) ; 'up' = bulle en-dessous de la cible */
  tail?: 'down' | 'up';
}

/**
 * Bulle de "spotlight" compacte qui pointe vers la carte mise en avant.
 * `tail="down"` : la bulle est au-dessus de la cible (flèche vers le bas).
 * `tail="up"`   : la bulle est en-dessous de la cible (flèche vers le haut).
 */
export function Level1TourCoachBubble({ message, tail = 'down' }: Level1TourCoachBubbleProps) {
  const { colors, fonts, borderRadius } = useCashouTheme();
  const bg = colors.card;
  const borderColor = colors.border;

  if (!message) return null;

  // Flèche : carré pivoté à 45°. Pointe vers le bas (bordures bas+droite) ou vers le haut (haut+gauche).
  const arrow = (
    <View
      style={[
        styles.tail,
        { backgroundColor: bg, borderColor },
        tail === 'down'
          ? { marginTop: -9, borderRightWidth: 1, borderBottomWidth: 1 }
          : { marginBottom: -9, borderLeftWidth: 1, borderTopWidth: 1 },
      ]}
    />
  );

  return (
    <View style={styles.wrap} pointerEvents="none">
      {tail === 'up' && arrow}
      <View
        style={[
          styles.bubble,
          { backgroundColor: bg, borderColor, borderRadius: borderRadius.lg },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${colors.text}10` }]}>
          <Ionicons name="school" size={16} color={colors.text} />
        </View>
        <Text style={[styles.text, { color: colors.text, fontFamily: fonts.body }]}>
          {message}
        </Text>
      </View>
      {tail === 'down' && arrow}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 1,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  tail: {
    width: 16,
    height: 16,
    transform: [{ rotate: '45deg' }],
  },
});

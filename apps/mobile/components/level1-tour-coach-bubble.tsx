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
  const { colors, fonts, borderRadius, isDark } = useCashouTheme();
  const accent = colors.accent;
  // Fond opaque (pas de transparence) pour que la flèche masque proprement la bordure de la bulle.
  const bg = isDark ? colors.card : '#FFF6EC';

  if (!message) return null;

  // Flèche : carré pivoté à 45°. Pointe vers le bas (bordures bas+droite) ou vers le haut (haut+gauche).
  const arrow = (
    <View
      style={[
        styles.tail,
        { backgroundColor: bg, borderColor: accent },
        tail === 'down'
          ? { marginTop: -9, borderRightWidth: 2, borderBottomWidth: 2 }
          : { marginBottom: -9, borderLeftWidth: 2, borderTopWidth: 2 },
      ]}
    />
  );

  return (
    <View style={styles.wrap} pointerEvents="none">
      {tail === 'up' && arrow}
      <View
        style={[
          styles.bubble,
          { backgroundColor: bg, borderColor: accent, borderRadius: borderRadius.lg },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${accent}33` }]}>
          <Ionicons name="school" size={16} color={accent} />
        </View>
        <Text style={[styles.text, { color: colors.text, fontFamily: fonts.subheading }]}>
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
    lineHeight: 20,
    fontWeight: '600',
  },
  tail: {
    width: 16,
    height: 16,
    transform: [{ rotate: '45deg' }],
  },
});

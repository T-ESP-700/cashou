import { View, Text, useColorScheme as useRNColorScheme, StyleSheet, TouchableOpacity } from 'react-native';
import { CashouTheme } from '@/constants/cashou-theme';

interface LevelCardProps {
  level: number;
  levelId?: number;
  title?: string | null;
  progression: number; // 0-100
  currentReturn: number; // percentage
  status?: 'not_started' | 'in_progress' | 'completed';
  onPress?: () => void;
}

export function LevelCard({
  level,
  levelId,
  title,
  progression,
  currentReturn,
  status = 'in_progress',
  onPress,
}: LevelCardProps) {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  // Texte et couleur du badge selon le statut
  const getBadgeConfig = () => {
    switch (status) {
      case 'not_started':
        return { text: 'Prêt', color: '#4CAF50' }; // Vert
      case 'in_progress':
        return { text: 'En cours', color: theme.accent };
      case 'completed':
        return { text: 'Terminé', color: '#9E9E9E' }; // Gris
      default:
        return { text: 'En cours', color: theme.accent };
    }
  };

  const badgeConfig = getBadgeConfig();

  // Affichage spécial pour un niveau non commencé
  if (status === 'not_started') {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Header with Level and Status Badge */}
        <View style={styles.header}>
          <Text style={[styles.level, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            Niveau {level}
          </Text>
          <View style={[styles.badge, { backgroundColor: badgeConfig.color }]}>
            <View style={styles.badgeDot} />
            <Text style={[styles.badgeText, { fontFamily: CashouTheme.fonts.body }]}>
              {badgeConfig.text}
            </Text>
          </View>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            Bienvenue dans Cashou !
          </Text>
          <Text style={[styles.welcomeText, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
            Prêt à apprendre à investir ? Appuyez ici pour découvrir le niveau {level} et commencer votre aventure financière.
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header with Level and Status Badge */}
      <View style={styles.header}>
        <Text style={[styles.level, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
          Niveau {level}
        </Text>
        <View style={[styles.badge, { backgroundColor: badgeConfig.color }]}>
          <View style={styles.badgeDot} />
          <Text style={[styles.badgeText, { fontFamily: CashouTheme.fonts.body }]}>
            {badgeConfig.text}
          </Text>
        </View>
      </View>

      {/* Progression Section */}
      <View style={styles.progressionSection}>
        <View style={styles.labelsRow}>
          <Text style={[styles.label, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
            Progression
          </Text>
          <Text style={[styles.label, { fontFamily: CashouTheme.fonts.body, color: theme.text }]}>
            Rendement actuel
          </Text>
        </View>

        <View style={styles.valuesRow}>
          {/* Progression Percentage */}
          <Text style={[styles.progressionValue, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
            {progression}%
          </Text>

          {/* Current Return */}
          <View style={styles.returnContainer}>
            <Text style={styles.triangle}>▲</Text>
            <Text style={[styles.returnValue, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
              {currentReturn}%
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: isDark ? '#3A3D55' : '#E0E0E0' }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: theme.accent,
              width: `${progression}%`,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  level: {
    fontSize: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 14,
    color: '#1C1E33',
  },
  progressionSection: {
    marginBottom: 16,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  progressionValue: {
    fontSize: 36,
  },
  returnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  triangle: {
    fontSize: 24,
    marginRight: 4,
  },
  returnValue: {
    fontSize: 30,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  // Styles pour le niveau non commencé
  welcomeSection: {
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
});

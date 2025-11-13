import { View, Text, useColorScheme as useRNColorScheme, StyleSheet } from 'react-native';
import { CashouTheme } from '@/constants/cashou-theme';

interface LevelCardProps {
  level: number;
  progression: number; // 0-100
  currentReturn: number; // percentage
  status?: 'in_progress' | 'completed';
}

export function LevelCard({
  level,
  progression,
  currentReturn,
  status = 'in_progress',
}: LevelCardProps) {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Header with Level and Status Badge */}
      <View style={styles.header}>
        <Text style={[styles.level, { fontFamily: CashouTheme.fonts.subheading, color: theme.text }]}>
          Niveau {level}
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <View style={styles.badgeDot} />
          <Text style={[styles.badgeText, { fontFamily: CashouTheme.fonts.body }]}>
            {status === 'in_progress' ? 'En cours' : 'Terminé'}
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
    </View>
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
});

import { View, Text, useColorScheme as useRNColorScheme, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CashouTheme } from '@/constants/cashou-theme';
import Svg, { Circle } from 'react-native-svg';

interface DailyQuizCardProps {
  winStreak: number;
  timeRemaining: string; // Format: "6h34m"
  status?: 'todo' | 'done';
}

export function DailyQuizCard({
  winStreak,
  timeRemaining,
  status = 'todo',
}: DailyQuizCardProps) {
  const router = useRouter();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  const handlePress = () => {
    router.push('/(tabs)/daily-quiz');
  };

  // Calculate progress for circular chart: le cercle se remplit au fur et à mesure que la journée avance
  // 0% au début de la journée (24h restantes), 100% à la fin (0h restantes)
  const calculateProgress = () => {
    const parts = timeRemaining.match(/(\d+)h(\d+)m/);
    if (!parts) return 0;
    const hours = parseInt(parts[1]);
    const minutes = parseInt(parts[2]);
    const totalMinutesRemaining = hours * 60 + minutes;
    const totalMinutesInDay = 24 * 60;
    // Plus il reste de temps, moins il y a de progression
    // Plus le temps passe, plus la progression augmente
    const progress = ((totalMinutesInDay - totalMinutesRemaining) / totalMinutesInDay) * 100;
    return Math.max(0, Math.min(100, progress)); // S'assurer que c'est entre 0 et 100%
  };

  const progress = calculateProgress();
  const radius = 30; 
  const strokeWidth = 6; 
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header with Title and Status Badge */}
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { fontFamily: CashouTheme.fonts.subheading, color: theme.text },
          ]}
        >
          Daily Quiz
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Text style={styles.badgeIcon}>ℹ️</Text>
          <Text
            style={[styles.badgeText, { fontFamily: CashouTheme.fonts.body }]}
          >
            {status === "todo" ? "À faire" : "Terminé"}
          </Text>
        </View>
      </View>

      {/* Win Streak and Time Remaining */}
      <View style={styles.content}>
        {/* Win Streak */}
        <View>
          <Text
            style={[
              styles.label,
              { fontFamily: CashouTheme.fonts.body, color: theme.text },
            ]}
          >
            win streak
          </Text>
          <View style={styles.streakContainer}>
            <Text
              style={[
                styles.streakNumber,
                { fontFamily: CashouTheme.fonts.subheading, color: theme.text },
              ]}
            >
              {winStreak}
            </Text>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>
        </View>

        {/* Time Remaining with Circular Progress or Validated Logo */}
        <View style={styles.timeContainer}>
          <Text
            style={[
              styles.label,
              { fontFamily: CashouTheme.fonts.body, color: theme.text },
            ]}
          >
            {status === 'done' ? 'Prochain quiz dans :' : 'Temps restant'}
          </Text>
          <View style={styles.circularProgress}>
              {/* Circular Progress Chart */}
              <Svg width={70} height={70} style={styles.svg}>
                {/* Background Circle */}
                <Circle
                  cx="35"
                  cy="35"
                  r={radius}
                  stroke={isDark ? "#3A3D55" : "#E0E0E0"}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Progress Circle */}
                <Circle
                  cx="35"
                  cy="35"
                  r={radius}
                  stroke={theme.accent}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="35, 35"
                />
              </Svg>
              {/* Time Text - Centré dans le cercle */}
              <View style={styles.timeTextContainer}>
                <Text
                  style={[
                    styles.timeText,
                    {
                      fontFamily: CashouTheme.fonts.subheading,
                      color: theme.text,
                    },
                  ]}
                >
                  {timeRemaining}
                </Text>
              </View>
            </View>
        </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 14,
    color: '#1C1E33',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 48,
  },
  fireEmoji: {
    fontSize: 36,
    marginLeft: 4,
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  circularProgress: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
  },
  svg: {
    position: 'absolute',
  },
  timeTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
  },
  timeText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

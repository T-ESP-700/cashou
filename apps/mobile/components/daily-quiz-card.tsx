import { View, Text, useColorScheme as useRNColorScheme, StyleSheet } from 'react-native';
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
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  // Calculate progress for circular chart (example: decreasing over 24h)
  const calculateProgress = () => {
    const parts = timeRemaining.match(/(\d+)h(\d+)m/);
    if (!parts) return 0;
    const hours = parseInt(parts[1]);
    const minutes = parseInt(parts[2]);
    const totalMinutes = hours * 60 + minutes;
    return (totalMinutes / (24 * 60)) * 100;
  };

  const progress = calculateProgress();
  const radius = 35;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
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

        {/* Time Remaining with Circular Progress */}
        <View style={styles.timeContainer}>
          <Text
            style={[
              styles.label,
              { fontFamily: CashouTheme.fonts.body, color: theme.text },
            ]}
          >
            Temps restant
          </Text>
          <View style={styles.circularProgress}>
            {/* Circular Progress Chart */}
            <Svg width={90} height={90} style={styles.svg}>
              {/* Background Circle */}
              <Circle
                cx="45"
                cy="45"
                r={radius}
                stroke={isDark ? "#3A3D55" : "#E0E0E0"}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress Circle */}
              <Circle
                cx="45"
                cy="45"
                r={radius}
                stroke={theme.accent}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin="45, 45"
              />
            </Svg>
            {/* Time Text */}
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
    alignItems: 'center',
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
    alignItems: 'center',
  },
  circularProgress: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  timeText: {
    fontSize: 18,
    marginTop: 35,
  },
});

import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { Card, Badge } from '@/components/ui';
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
  const { colors, fonts, spacing } = useCashouTheme();

  const handlePress = () => {
    if (status === 'done') {
      router.push({
        pathname: '/(tabs)/daily-quiz',
        params: { showCompleted: 'true' },
      });
    } else {
      router.push('/(tabs)/daily-quiz');
    }
  };

  // Calculate progress for circular chart
  const calculateProgress = () => {
    const parts = timeRemaining.match(/(\d+)h(\d+)m/);
    if (!parts) return 0;
    const hours = parseInt(parts[1]);
    const minutes = parseInt(parts[2]);
    const totalMinutesRemaining = hours * 60 + minutes;
    const totalMinutesInDay = 24 * 60;
    const progress = ((totalMinutesInDay - totalMinutesRemaining) / totalMinutesInDay) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const progress = calculateProgress();
  const radius = 30;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card
        variant="outlined"
        padding="md"
        style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}
      >
        {/* Header with Title and Status Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <Text style={{ fontSize: 24, fontFamily: fonts.subheading, color: colors.text }}>
            Daily Quiz
          </Text>
          <Badge
            label={status === 'todo' ? 'À faire' : 'Terminé'}
            variant="accent"
            icon={<Text style={{ fontSize: 14 }}>ℹ️</Text>}
          />
        </View>

        {/* Win Streak and Time Remaining */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Win Streak */}
          <View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: fonts.body,
                color: colors.text,
                marginBottom: spacing.sm,
              }}
            >
              win streak
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 48, fontFamily: fonts.subheading, color: colors.text }}>
                {winStreak}
              </Text>
              <Text style={{ fontSize: 36, marginLeft: 4 }}>🔥</Text>
            </View>
          </View>

          {/* Time Remaining with Circular Progress */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: fonts.body,
                color: colors.text,
                marginBottom: spacing.sm,
              }}
            >
              {status === 'done' ? 'Prochain quiz dans :' : 'Temps restant'}
            </Text>
            <View
              style={{
                position: 'relative',
                alignItems: 'center',
                justifyContent: 'center',
                width: 70,
                height: 70,
              }}
            >
              {/* Circular Progress Chart */}
              <Svg width={70} height={70} style={{ position: 'absolute' }}>
                {/* Background Circle */}
                <Circle
                  cx="35"
                  cy="35"
                  r={radius}
                  stroke={colors.progressBarBackground}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Progress Circle */}
                <Circle
                  cx="35"
                  cy="35"
                  r={radius}
                  stroke={colors.accent}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="35, 35"
                />
              </Svg>
              {/* Time Text - Centered in circle */}
              <View
                style={{
                  position: 'absolute',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 70,
                  height: 70,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: fonts.subheading,
                    color: colors.text,
                    textAlign: 'center',
                  }}
                >
                  {timeRemaining}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

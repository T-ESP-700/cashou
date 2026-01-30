import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { Card, Badge } from '@/components/ui';

interface LevelCardProps {
  level: number;
  levelId?: number;
  title?: string | null;
  progression: number; // 0-100
  currentReturn: number; // percentage
  status?: 'not_started' | 'in_progress' | 'completed' | 'quiz_pending';
  stars?: number; // 1-3 from level completion
  onPress?: () => void;
}

export function LevelCard({
  level,
  levelId,
  title,
  progression,
  currentReturn,
  status = 'in_progress',
  stars = 0,
  onPress,
}: LevelCardProps) {
  const { colors, status: statusColors, special, fonts, spacing, borderRadius } = useCashouTheme();

  // Badge config based on status
  const getBadgeConfig = (): { text: string; variant: 'success' | 'accent' | 'neutral' | 'warning' } => {
    switch (status) {
      case 'not_started':
        return { text: 'Prêt', variant: 'success' };
      case 'in_progress':
        return { text: 'En cours', variant: 'accent' };
      case 'completed':
        return { text: 'Terminé', variant: 'neutral' };
      case 'quiz_pending':
        return { text: 'Quiz', variant: 'warning' };
      default:
        return { text: 'En cours', variant: 'accent' };
    }
  };

  const badgeConfig = getBadgeConfig();

  // Special display for not started level
  if (status === 'not_started') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Card
          variant="outlined"
          padding="md"
          style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}
        >
          {/* Header with Level and Status Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm + 4 }}>
            <Text style={{ fontSize: 24, fontFamily: fonts.subheading, color: colors.text }}>
              Niveau {level}
            </Text>
            <Badge label={badgeConfig.text} variant={badgeConfig.variant} showDot />
          </View>

          {/* Welcome Message */}
          <View style={{ marginBottom: spacing.sm }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: fonts.subheading,
                color: colors.text,
                marginBottom: spacing.sm,
              }}
            >
              Bienvenue dans Cashou !
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: fonts.body,
                color: colors.text,
                opacity: 0.8,
                lineHeight: 20,
              }}
            >
              Prêt à apprendre à investir ? Appuyez ici pour découvrir le niveau {level} et commencer votre aventure financière.
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card
        variant="outlined"
        padding="md"
        style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}
      >
        {/* Header with Level, Stars (when completed/quiz_pending), and Status Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm + 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24, fontFamily: fonts.subheading, color: colors.text }}>
              Niveau {level}
            </Text>
            {(status === 'completed' || status === 'quiz_pending') && stars > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                {[1, 2, 3].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= stars ? 'star' : 'star-outline'}
                    size={18}
                    color={i <= stars ? special.gold : colors.iconMuted}
                  />
                ))}
              </View>
            )}
          </View>
          <Badge label={badgeConfig.text} variant={badgeConfig.variant} showDot />
        </View>

        {/* Progression Section */}
        <View style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 14, fontFamily: fonts.body, color: colors.text }}>
              Progression
            </Text>
            <Text style={{ fontSize: 14, fontFamily: fonts.body, color: colors.text }}>
              Rendement actuel
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Progression Percentage */}
            <Text style={{ fontSize: 36, fontFamily: fonts.subheading, color: colors.text }}>
              {progression}%
            </Text>

            {/* Current Return */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: 4 }}>▲</Text>
              <Text style={{ fontSize: 30, fontFamily: fonts.subheading, color: colors.text }}>
                {currentReturn}%
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View
          style={{
            height: 12,
            borderRadius: borderRadius.sm - 2,
            overflow: 'hidden',
            backgroundColor: colors.progressBarBackground,
          }}
        >
          <View
            style={{
              height: '100%',
              borderRadius: borderRadius.sm - 2,
              backgroundColor: colors.accent,
              width: `${progression}%`,
            }}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

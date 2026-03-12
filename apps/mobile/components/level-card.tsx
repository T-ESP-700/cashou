import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { CashouTheme } from '@/constants/cashou-theme';
import { Card, Badge } from '@/components/ui';

interface LevelCardProps {
  level: number;
  levelId?: number;
  title?: string | null;
  cash: number;
  currentReturn: number; // percentage
  status?: 'not_started' | 'in_progress' | 'completed' | 'quiz_pending';
  stars?: number; // 1-3 from level completion
  onPress?: () => void;
}

export function LevelCard({
  level,
  levelId,
  title,
  cash,
  currentReturn,
  status = 'in_progress',
  stars = 0,
  onPress,
}: LevelCardProps) {
  const { colors, special, fonts, spacing } = useCashouTheme();

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
  const isPositiveReturn = currentReturn >= 0;
  const returnColor = isPositiveReturn ? CashouTheme.colors.status.success : CashouTheme.colors.status.error;
  const returnArrow = isPositiveReturn ? '↑' : '↓';

  // Special display for not started level
  if (status === 'not_started') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Card
          variant="default"
          padding="md"
          style={{}}
        >
          {/* Header: Niveau X + Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm + 4 }}>
            <Text style={{ fontSize: 24, fontFamily: fonts.body, color: colors.text }}>
              Niveau {level}
            </Text>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#9CD6FF', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-open-outline" size={16} color="#FFFFFF" />
            </View>
          </View>

          {/* Welcome Message */}
          <View>
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
        variant="default"
        padding="md"
        style={{}}
      >
        {/* Line 1: Niveau X (+ stars) | Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm + 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24, fontFamily: fonts.body, color: colors.text }}>
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
          {status === 'in_progress' && (
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFB472', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          )}
          {status === 'quiz_pending' && (
            <Badge label={badgeConfig.text} variant={badgeConfig.variant} showDot />
          )}
          {status === 'completed' && (
            <Ionicons name="checkmark-circle" size={34} color="#88D498" />
          )}
        </View>

        {/* Line 2: Cash amount | Return % */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 32, fontFamily: fonts.body, color: colors.text }}>
            {cash.toLocaleString('fr-FR')}€
          </Text>

          <Text style={{ fontSize: 22, fontFamily: fonts.body, color: returnColor }}>
            {returnArrow}{Math.abs(currentReturn)}%
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

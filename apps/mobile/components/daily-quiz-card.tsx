import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { Card, Badge } from '@/components/ui';

interface DailyQuizCardProps {
  status?: 'todo' | 'done';
}

export function DailyQuizCard({
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

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card
        variant="default"
        padding="md"
        style={{}}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 24, fontFamily: fonts.body, color: colors.text }}>
            Daily Quiz
          </Text>
          <Badge
            label={status === 'todo' ? 'À faire' : 'Terminé'}
            variant={status === 'todo' ? 'accent' : 'neutral'}
            showDot={status !== 'todo'}
            fontWeight={status === 'todo' ? '400' : undefined}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

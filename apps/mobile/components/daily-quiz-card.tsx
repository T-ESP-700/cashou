import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { Card, Badge } from '@/components/ui';

interface DailyQuizCardProps {
  status?: 'todo' | 'done';
}

const getTimeUntilMidnightParis = () => {
  const now = new Date();
  // Get current hour/minute in Paris timezone
  const parisTime = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const h = parseInt(parisTime.find(p => p.type === 'hour')?.value ?? '0');
  const m = parseInt(parisTime.find(p => p.type === 'minute')?.value ?? '0');
  const s = parseInt(parisTime.find(p => p.type === 'second')?.value ?? '0');

  const elapsedSeconds = h * 3600 + m * 60 + s;
  const totalSeconds = 86400 - elapsedSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const progress = elapsedSeconds / 86400;
  return { hours, minutes, progress };
};

const RING_SIZE = 38;
const STROKE_WIDTH = 3;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DailyQuizCard({
  status = 'todo',
}: DailyQuizCardProps) {
  const router = useRouter();
  const { colors, fonts, spacing } = useCashouTheme();
  const [timeInfo, setTimeInfo] = useState(getTimeUntilMidnightParis());

  useEffect(() => {
    if (status !== 'done') return;
    setTimeInfo(getTimeUntilMidnightParis());
    const interval = setInterval(() => {
      setTimeInfo(getTimeUntilMidnightParis());
    }, 60000);
    return () => clearInterval(interval);
  }, [status]);

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

  const strokeDashoffset = CIRCUMFERENCE * (1 - timeInfo.progress);

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
          {status === 'todo' ? (
            <Badge
              label="À faire"
              variant="accent"
              fontWeight="400"
            />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Circular progress with time */}
              <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={colors.borderLight}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                  />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke="#88D498"
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeDasharray={`${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={{ fontSize: 10, fontFamily: fonts.body, color: colors.text, opacity: 0.6 }}>
                  {timeInfo.hours}h
                </Text>
              </View>

              {/* Green check bubble */}
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#88D498', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </View>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

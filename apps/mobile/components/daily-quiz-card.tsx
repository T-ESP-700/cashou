import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Path } from 'react-native-svg';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { Card } from '@/components/ui';

interface DailyQuizCardProps {
  status?: 'todo' | 'done';
}

const getTimeUntilMidnightParis = () => {
  const now = new Date();
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

export function DailyQuizCard({
  status = 'todo',
}: DailyQuizCardProps) {
  const router = useRouter();
  const { colors, fonts } = useCashouTheme();
  const [timeInfo, setTimeInfo] = useState(getTimeUntilMidnightParis());

  useEffect(() => {
    setTimeInfo(getTimeUntilMidnightParis());
    const interval = setInterval(() => {
      setTimeInfo(getTimeUntilMidnightParis());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePress = () => {
    if (status === 'done') {
      router.push('/(tabs)/history');
    } else {
      router.push({
        pathname: '/(tabs)/daily-quiz',
        params: { source: 'home' },
      });
    }
  };

  const isTodo = status === 'todo';
  const ringColor = isTodo ? '#9CD6FF' : '#88D498';
  const iconName = isTodo ? 'lock-open-outline' : 'checkmark';
  const textColor = isTodo ? '#006DBB' : colors.text;
  const iconColor = isTodo ? '#006DBB' : '#3D7248';
  const remainingPercent = Math.max(0, Math.min(100, (1 - timeInfo.progress) * 100));
  const timerWidth = 48;
  const timerHeight = 32;
  const timerStroke = 2;
  const timerRadius = 16;
  const timerPathWidth = timerWidth - timerStroke;
  const timerPathHeight = timerHeight - timerStroke;
  const effectiveTimerRadius = Math.min(timerRadius, timerPathWidth / 2, timerPathHeight / 2);
  const timerPerimeter = 2 * (timerPathWidth + timerPathHeight - (4 * effectiveTimerRadius)) + (2 * Math.PI * effectiveTimerRadius);
  const timerProgressLength = (remainingPercent / 100) * timerPerimeter;
  const timerBgColor = isTodo ? '#9CD6FF' : '#88D498';
  const timerProgressColor = isTodo ? '#006DBB' : '#3D7248';
  const timerX = timerStroke / 2;
  const timerY = timerStroke / 2;
  const topSegmentLength = timerPathWidth - (2 * effectiveTimerRadius);
  const topMiddleX = timerX + effectiveTimerRadius + (topSegmentLength / 2);
  const rightX = timerX + timerPathWidth;
  const bottomY = timerY + timerPathHeight;
  const timerPathD = [
    `M ${topMiddleX} ${timerY}`,
    `H ${rightX - effectiveTimerRadius}`,
    `A ${effectiveTimerRadius} ${effectiveTimerRadius} 0 0 1 ${rightX} ${timerY + effectiveTimerRadius}`,
    `V ${bottomY - effectiveTimerRadius}`,
    `A ${effectiveTimerRadius} ${effectiveTimerRadius} 0 0 1 ${rightX - effectiveTimerRadius} ${bottomY}`,
    `H ${timerX + effectiveTimerRadius}`,
    `A ${effectiveTimerRadius} ${effectiveTimerRadius} 0 0 1 ${timerX} ${bottomY - effectiveTimerRadius}`,
    `V ${timerY + effectiveTimerRadius}`,
    `A ${effectiveTimerRadius} ${effectiveTimerRadius} 0 0 1 ${timerX + effectiveTimerRadius} ${timerY}`,
    `H ${topMiddleX}`,
  ].join(' ');

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: timerWidth,
                height: timerHeight,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Svg width={timerWidth} height={timerHeight} style={{ position: 'absolute' }}>
                <Rect
                  x={timerX}
                  y={timerY}
                  width={timerPathWidth}
                  height={timerPathHeight}
                  rx={timerRadius}
                  ry={timerRadius}
                  fill={timerBgColor}
                  stroke={timerBgColor}
                  strokeWidth={timerStroke}
                />
                <Path
                  d={timerPathD}
                  fill="none"
                  stroke={timerProgressColor}
                  strokeWidth={timerStroke}
                  strokeLinecap="round"
                  strokeDasharray={`${timerProgressLength} ${Math.max(timerPerimeter - timerProgressLength, 0)}`}
                />
              </Svg>
              <Text style={{ fontSize: 13, textAlign: 'center', fontFamily: fonts.body, color: textColor }}>
                {timeInfo.hours}h
              </Text>
            </View>

            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: ringColor, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={iconName} size={18} color={iconColor} />
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

import React, { useEffect } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const LOGO_GAP = 40;
const LOGO_OPACITY = 0.4;
// Original viewBox: 830 x 1080
const ASPECT_RATIO = 830 / 1080;

function CashouPiggy({ size, opacity }: { size: number; opacity: number }) {
  const width = size * ASPECT_RATIO;
  return (
    <Svg
      width={width}
      height={size}
      viewBox="0 0 830 1080"
      fill="none"
      style={{ opacity }}
    >
      <Path
        d="M79.4043 219.142C-14.5928 370.642 54.6284 673.142 61.4043 695.143C98.9823 817.151 134.219 888.806 225.904 977.643C386.905 1133.64 707.905 994.642 753.905 936.142C827.155 842.988 813.491 688.626 700.905 651.642C636.308 630.423 564.406 690.642 494.906 673.142C438.109 658.841 420.461 610.428 410.906 552.642C400.868 491.939 394.787 437.797 441.406 397.642C483.17 361.669 572.847 388.846 619.905 360.142C727.392 294.58 722.23 136.624 616.905 67.6424C551.314 24.6838 405.355 22.309 329.906 43.6422C250.406 66.1206 251.906 65.9633 200.906 97.6425C149.906 129.322 114.912 161.912 79.4043 219.142Z"
        stroke="#FFB472"
        strokeWidth={61}
      />
      <Path
        d="M661.419 853.644C661.419 853.644 493.451 939.54 389.907 903.143C288.979 867.665 238.883 816.077 206.408 714.143C188.407 657.643 152.406 552.143 155.91 432.642C157.83 367.171 186.41 250.143 283.91 195.143C379.514 141.213 524.919 169.143 524.919 169.143"
        stroke="#FFB472"
        strokeWidth={45}
        strokeLinecap="round"
      />
    </Svg>
  );
}

interface ScrollingRowProps {
  count: number;
  duration: number;
  opacity: number;
  logoSize: number;
  reverse?: boolean;
}

function ScrollingRow({ count, duration, opacity, logoSize, reverse = false }: ScrollingRowProps) {
  const logoWidth = logoSize * ASPECT_RATIO;
  const itemWidth = logoWidth + LOGO_GAP;
  // Width of one full set — the modulo cycle length
  const setWidth = count * itemWidth;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    // Animate from 0 → setWidth infinitely; modulo in the style makes it seamless
    progress.value = withRepeat(
      withTiming(setWidth, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [count, duration, setWidth]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Modulo wraps the value so it never jumps — 0 and setWidth map to the same visual position
    const offset = progress.value % setWidth;
    return {
      transform: [{ translateX: reverse ? offset - setWidth : -offset }],
    };
  });

  // 2 sets: one visible on screen, one entering from the side
  const logos = Array.from({ length: count * 2 }, (_, i) => (
    <View key={i} style={{ width: logoWidth, marginRight: LOGO_GAP }}>
      <CashouPiggy size={logoSize} opacity={opacity} />
    </View>
  ));

  return (
    <View style={styles.rowContainer}>
      <Animated.View style={[styles.row, animatedStyle]}>
        {logos}
      </Animated.View>
    </View>
  );
}

export function ScrollingLogos() {
  const { width: screenWidth } = useWindowDimensions();
  const baseItemWidth = 48 * ASPECT_RATIO + LOGO_GAP;
  const count = Math.ceil(screenWidth / baseItemWidth) + 2;

  return (
    <View style={styles.container}>
      <ScrollingRow count={count} duration={25000} opacity={LOGO_OPACITY} logoSize={44} />
      <ScrollingRow count={count} duration={35000} opacity={LOGO_OPACITY * 1.5} logoSize={52} reverse />
      <ScrollingRow count={count} duration={20000} opacity={LOGO_OPACITY} logoSize={40} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
    overflow: 'hidden',
  },
  rowContainer: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

import React from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Platform,
} from 'react-native';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { TutorialBubble } from '@/components/tutorial-bubble';

interface Level1TourOverlayProps {
  visible: boolean;
  message: string;
  /**
   * Height (px) of the bottom action bar from onLayout — dimming stops above it so pills stay
   * visible, on top (sibling z-order), and fully clickable.
   */
  reserveBottomPx: number;
  onBackdropPress?: () => void;
}

/**
 * Dims the screen above the bottom chrome only. Must be rendered *before* the action bar in the
 * tree so the bar draws above the dim layer (see current.tsx z-index).
 */
export function Level1TourOverlay({
  visible,
  message,
  reserveBottomPx,
  onBackdropPress,
}: Level1TourOverlayProps) {
  const { height: sh } = useWindowDimensions();
  const { spacing, isDark } = useCashouTheme();

  if (!visible || !message) {
    return null;
  }

  const reserved = Math.max(72, reserveBottomPx);
  const dimHeight = Math.max(0, sh - reserved);

  return (
    <View
      style={[styles.overlayRoot, Platform.OS === 'android' ? { elevation: 200 } : null]}
      pointerEvents="box-none"
    >
      <Pressable
        style={[
          styles.dimBand,
          {
            height: dimHeight,
            backgroundColor: overlayColor(isDark),
          },
        ]}
        onPress={onBackdropPress}
      />

      <View
        pointerEvents="none"
        style={[
          styles.bubbleWrap,
          {
            bottom: reserved + 12,
            left: spacing.md,
            right: spacing.md,
          },
        ]}
      >
        <TutorialBubble message={message} />
      </View>
    </View>
  );
}

function overlayColor(isDark: boolean): string {
  return isDark ? 'rgba(0,0,0,0.72)' : 'rgba(28,30,51,0.55)';
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  dimBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bubbleWrap: {
    position: 'absolute',
  },
});

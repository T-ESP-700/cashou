import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useNotifications } from '@/hooks/use-notifications';
import { ActionPillButton } from '@/components/ui';
import { useOptionalLevel1Tour } from '@/contexts/level1-tour-context';
import { tourBubbleForStep, Level1TourStep } from '@/constants/level1-tour';

export function EventNotificationModal() {
  const { colors, isDark } = useCashouTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { eventNotification, clearEventNotification, setPendingEventCompletion, setRequestedAssetsSheetGameId } = useNotifications();
  const level1Tour = useOptionalLevel1Tour();
  const restrictSecondEvent = Boolean(level1Tour?.restrictEventModalToAssetsOnly);

  const isVisible = eventNotification !== null;

  const isOnCurrentScreen = pathname === '/game/current';

  const handleClose = async () => {
    if (!eventNotification?.gameInstanceId) {
      clearEventNotification();
      return;
    }

    const gameInstanceId = eventNotification.gameInstanceId;
    clearEventNotification();
    setPendingEventCompletion(gameInstanceId);
  };

  const handleGoToAssets = () => {
    if (!eventNotification?.gameInstanceId) {
      clearEventNotification();
      return;
    }

    const gameInstanceId = eventNotification.gameInstanceId;

    // Mark event as pending — current.tsx will complete it when opening the sheet
    setPendingEventCompletion(gameInstanceId);
    clearEventNotification();

    // Signal current.tsx to open the assets bottom sheet
    setRequestedAssetsSheetGameId(gameInstanceId);

    if (!isOnCurrentScreen) {
      // Navigate to /game/current — the assets sheet request will be consumed on mount
      router.replace({
        pathname: '/game/current',
        params: { gameId: gameInstanceId.toString() },
      });
    }
  };

  if (!eventNotification) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <BlurView
        intensity={60}
        tint={isDark ? 'dark' : 'light'}
        style={styles.blur}
      >
        <Pressable style={styles.overlay} onPress={restrictSecondEvent ? undefined : handleClose}>
          <View
            onStartShouldSetResponder={() => true}
            style={[styles.cardBackdrop, { backgroundColor: colors.secondary }]}
          >
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.border }]}>
              {/* Event Icon */}
              <View style={[styles.iconCircle, { backgroundColor: `${colors.accent}20` }]}>
                <Ionicons name="flash" size={40} color={colors.accent} />
              </View>

              {/* Title */}
              <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
                {eventNotification.title ?? 'Nouvel événement !'}
              </Text>

              {/* Body/Description */}
              <Text allowFontScaling={false} style={[styles.description, { color: colors.text }]}>
                {eventNotification.body ?? 'Un événement vient de se produire dans le jeu. Consultez vos assets pour voir les changements.'}
              </Text>

              {restrictSecondEvent && level1Tour && (
                <Text allowFontScaling={false} style={[styles.tourHint, { color: colors.text }]}>
                  {tourBubbleForStep(Level1TourStep.SecondEventOpenAssets, level1Tour.eventPhase)}
                </Text>
              )}

              {/* Buttons */}
              <View style={styles.actions}>
                {!restrictSecondEvent && (
                  <ActionPillButton
                    label="Plus tard"
                    iconName="checkmark"
                    onPress={handleClose}
                    style={{ flex: 1 }}
                  />
                )}
                <ActionPillButton
                  label="Investir"
                  iconName="add"
                  onPress={handleGoToAssets}
                  style={{ flex: restrictSecondEvent ? undefined : 1, width: restrictSecondEvent ? '100%' as const : undefined }}
                />
              </View>
            </View>
          </View>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  cardBackdrop: {
    width: '97%',
    maxWidth: 410,
    borderRadius: 36,
    padding: 6,
  },
  card: {
    width: '100%',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 20,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    alignItems: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Anybody',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Anybody',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.85,
    marginBottom: 16,
  },
  tourHint: {
    fontSize: 13,
    fontFamily: 'Anybody',
    textAlign: 'center',
    lineHeight: 19,
    opacity: 0.9,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
});

import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Platform,
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
import { Level1TourCoachBubble } from '@/components/level1-tour-coach-bubble';

export function EventNotificationModal() {
  const { colors, isDark } = useCashouTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { eventNotification, clearEventNotification, setPendingEventCompletion, setRequestedAssetsSheetGameId } = useNotifications();
  const level1Tour = useOptionalLevel1Tour();
  // Restrict the modal to "Invest only" only when the level actually has another livret
  // to migrate to. For levels with a single livret (new level 1), allow "Plus tard".
  const restrictToAssetsOnly =
    Boolean(level1Tour?.sessionActive) &&
    Boolean(level1Tour?.hasOtherSavings) &&
    (level1Tour?.eventPhase ?? 0) === 0 &&
    level1Tour?.step !== Level1TourStep.Done;

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
        <View style={[styles.overlay, { backgroundColor: restrictToAssetsOnly ? 'rgba(28,30,51,0.55)' : 'transparent' }]}>
          {!restrictToAssetsOnly && (
            <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
          )}
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

              {/* Tutorial bubble: absolutely overlaid, same pattern as end-game modal */}
              {restrictToAssetsOnly && level1Tour && (
                <View
                  pointerEvents="box-none"
                  style={styles.tourBubbleAbs}
                >
                  <Level1TourCoachBubble
                    tail="down"
                    message={tourBubbleForStep(Level1TourStep.PostEventOpenAssets, level1Tour.eventPhase)}
                  />
                </View>
              )}

              {/* Buttons */}
              <View style={[styles.actions, restrictToAssetsOnly && { zIndex: 20, elevation: 20 }]}>
                <View style={styles.btnWrap}>
                  <ActionPillButton
                    label="Plus tard"
                    iconName="checkmark"
                    onPress={handleClose}
                    style={StyleSheet.flatten([
                      styles.btnFull,
                      restrictToAssetsOnly ? { opacity: 0.35 } : null,
                    ])}
                  />
                </View>
                <View style={styles.btnWrap}>
                  <ActionPillButton
                    label="Investir"
                    iconName="add"
                    onPress={handleGoToAssets}
                    style={StyleSheet.flatten([
                      styles.btnFull,
                      restrictToAssetsOnly ? tourFocusedPillStyle : null,
                    ])}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const tourFocusedPillStyle =
  Platform.OS === 'android'
    ? { borderWidth: 3, borderColor: '#FFFFFF', elevation: 20 }
    : {
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      };

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
  tourBubbleAbs: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 30,
    elevation: 30,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  btnWrap: {
    flex: 1,
  },
  btnFull: {
    width: '100%',
  },
});

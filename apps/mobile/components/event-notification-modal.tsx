import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  useColorScheme as useRNColorScheme,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { CashouTheme } from '@/constants/cashou-theme';
import { useNotifications } from '@/hooks/use-notifications';
import { trpcClient } from '@/lib/trpc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function EventNotificationModal() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ gameId?: string }>();
  const { eventNotification, clearEventNotification, setPendingEventCompletion } = useNotifications();
  const [isOpeningAssets, setIsOpeningAssets] = useState(false);
  const hasNavigatedRef = useRef<number | null>(null);

  const isVisible = eventNotification !== null;

  // Navigate to /game/current when an event notification is received
  useEffect(() => {
    if (!eventNotification?.gameInstanceId) {
      hasNavigatedRef.current = null;
      return;
    }

    const gameInstanceId = eventNotification.gameInstanceId;

    // Don't navigate if we already navigated for this notification
    if (hasNavigatedRef.current === gameInstanceId) {
      return;
    }

    // Check if we're already on /game/current with the same gameId
    const isOnCurrentGame =
      pathname === '/game/current' &&
      params.gameId === gameInstanceId.toString();

    if (!isOnCurrentGame) {
      hasNavigatedRef.current = gameInstanceId;
      // Navigate to /game/current with the gameId
      router.push({
        pathname: '/game/current',
        params: { gameId: gameInstanceId.toString() },
      });
    }
  }, [eventNotification, pathname, params.gameId, router]);

  const handleClose = async () => {
    if (!eventNotification?.gameInstanceId) {
      clearEventNotification();
      return;
    }

    // Don't complete the event yet - the game stays paused until the user
    // goes to /assets and returns to /current.
    // Mark that we need to complete it when returning from assets.
    setPendingEventCompletion(eventNotification.gameInstanceId);
    clearEventNotification();
  };

  const handleGoToAssets = async () => {
    if (!eventNotification?.gameInstanceId) {
      clearEventNotification();
      router.push('/game/assets');
      return;
    }

    const gameInstanceId = eventNotification.gameInstanceId;

    // Don't complete the event yet - keep the game paused.
    // Mark that we need to complete it when returning to the game.
    setPendingEventCompletion(gameInstanceId);
    clearEventNotification();

    try {
      setIsOpeningAssets(true);

      // Fetch the wallet tied to this game instance to navigate with the same context
      let walletId: string | null = null;
      try {
        const wallets = await trpcClient.wallet.getByGameInstance.query({ gameInstanceId });
        if (Array.isArray(wallets) && wallets.length > 0 && wallets[0]?.id) {
          walletId = wallets[0].id.toString();
        }
      } catch (err) {
        console.error(`[EventNotificationModal] Failed to fetch wallet for game ${gameInstanceId}:`, err);
      }

      const params: Record<string, string> = {
        gameInstanceId: gameInstanceId.toString(),
      };
      if (walletId) {
        params.walletId = walletId;
      }

      router.push({
        pathname: '/game/assets',
        params,
      });
    } finally {
      setIsOpeningAssets(false);
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
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={styles.blurContainer}
      >
        <View style={[styles.overlay]}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Event Icon */}
            <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
              <Ionicons name="flash" size={40} color={theme.accent} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
              {eventNotification.title ?? 'Nouvel événement !'}
            </Text>

            {/* Body/Description */}
            <Text style={[styles.body, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
              {eventNotification.body ?? 'Un événement vient de se produire dans le jeu. Consultez vos assets pour voir les changements.'}
            </Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                  Plus tard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: theme.accent, opacity: isOpeningAssets ? 0.8 : 1 }]}
                onPress={handleGoToAssets}
                activeOpacity={0.7}
                disabled={isOpeningAssets}
              >
                {isOpeningAssets ? (
                  <ActivityIndicator size="small" color="#1C1E33" />
                ) : (
                  <Text style={[styles.buttonText, { color: '#1C1E33', fontFamily: CashouTheme.fonts.subheading }]}>
                    Voir mes assets
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    borderRadius: CashouTheme.borderRadius.xl,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    // Shadow for Android
    elevation: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.85,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: CashouTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    // backgroundColor set inline
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
  },
});

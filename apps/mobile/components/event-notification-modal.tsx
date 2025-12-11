import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  useColorScheme as useRNColorScheme,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CashouTheme } from '@/constants/cashou-theme';
import { useNotifications, type EventNotificationData } from '@/hooks/use-notifications';
import { trpcClient } from '@/lib/trpc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function EventNotificationModal() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;
  const router = useRouter();
  const { eventNotification, clearEventNotification, setPendingEventCompletion } = useNotifications();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isOpeningAssets, setIsOpeningAssets] = useState(false);

  const isVisible = eventNotification !== null;

  const handleClose = async () => {
    if (!eventNotification?.gameInstanceId) {
      clearEventNotification();
      return;
    }

    try {
      setIsCompleting(true);
      // Complete the event to resume the game
      await trpcClient.gameInstance.completeEvent.mutate({
        id: eventNotification.gameInstanceId,
      });
      clearEventNotification();
    } catch (error) {
      console.error('[EventNotificationModal] Failed to complete event:', error);
      Alert.alert(
        'Erreur',
        'Impossible de reprendre la partie. Veuillez réessayer.',
        [
          {
            text: 'OK',
            onPress: () => clearEventNotification(),
          },
        ]
      );
    } finally {
      setIsCompleting(false);
    }
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
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.text, fontFamily: CashouTheme.fonts.subheading }]}>
                    Fermer
                  </Text>
                )}
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

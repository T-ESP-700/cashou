import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useNotifications } from '@/hooks/use-notifications';
import { trpcClient } from '@/lib/trpc';
import { Card, Button } from '@/components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function EventNotificationModal() {
  const { colors, special, fonts, spacing, borderRadius, isDark } = useCashouTheme();
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

      const navigationParams: Record<string, string> = {
        gameInstanceId: gameInstanceId.toString(),
      };
      if (walletId) {
        navigationParams.walletId = walletId;
      }

      router.push({
        pathname: '/game/assets',
        params: navigationParams,
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
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Card
            variant="elevated"
            padding="lg"
            style={{
              width: SCREEN_WIDTH - 48,
              maxWidth: 400,
              alignItems: 'center',
            }}
          >
            {/* Event Icon */}
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: `${colors.accent}20`,
                marginBottom: 20,
              }}
            >
              <Ionicons name="flash" size={40} color={colors.accent} />
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 22,
                fontFamily: fonts.heading,
                color: colors.text,
                textAlign: 'center',
                marginBottom: spacing.sm + 4,
              }}
            >
              {eventNotification.title ?? 'Nouvel événement !'}
            </Text>

            {/* Body/Description */}
            <Text
              style={{
                fontSize: 16,
                fontFamily: fonts.body,
                color: colors.text,
                textAlign: 'center',
                lineHeight: 24,
                marginBottom: spacing.lg,
                opacity: 0.85,
              }}
            >
              {eventNotification.body ?? 'Un événement vient de se produire dans le jeu. Consultez vos assets pour voir les changements.'}
            </Text>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', width: '100%', gap: spacing.sm + 4 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Plus tard"
                  variant="outline"
                  onPress={handleClose}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Voir mes assets"
                  variant="primary"
                  onPress={handleGoToAssets}
                  isLoading={isOpeningAssets}
                  fullWidth
                />
              </View>
            </View>
          </Card>
        </View>
      </BlurView>
    </Modal>
  );
}

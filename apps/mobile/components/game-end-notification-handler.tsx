import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useNotifications } from '@/hooks/use-notifications';

/**
 * Headless component (renders null) that navigates to the game screen
 * when a GAME_END notification is received and the user is not already there.
 * The existing polling in current.tsx will detect isEnded and show the modal.
 */
export function GameEndNotificationHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { gameEndNotification, clearGameEndNotification } = useNotifications();

  useEffect(() => {
    if (!gameEndNotification) return;

    const { gameInstanceId } = gameEndNotification;
    const isOnGameScreen = pathname === '/game/current';

    if (isOnGameScreen) {
      // Already on the game screen — the existing polling will handle it
      console.log('[GameEndHandler] Already on game screen, clearing notification');
      clearGameEndNotification();
    } else {
      // Navigate to game screen so the end-game modal can be shown
      console.log('[GameEndHandler] Navigating to game screen for game', gameInstanceId);
      clearGameEndNotification();
      router.replace({
        pathname: '/game/current',
        params: { gameId: String(gameInstanceId) },
      });
    }
  }, [gameEndNotification, pathname, router, clearGameEndNotification]);

  return null;
}

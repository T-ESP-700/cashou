import { useState, useEffect, useRef, useCallback, createContext, useContext, type ReactNode } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { trpcClient } from '@/lib/trpc';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
import { useAuth } from '@/hooks/use-auth';

export interface EventNotificationData {
  type: 'EVENT';
  gameInstanceId: number;
  eventId: number;
  title?: string;
  body?: string;
}

export interface GameEndNotificationData {
  type: 'GAME_END';
  gameInstanceId: number;
  success: boolean;
  totalValue: number;
  title?: string;
  body?: string;
}

// Global setters to allow the handler (outside component) to update state
let globalSetEventNotification: ((data: EventNotificationData | null) => void) | null = null;
let globalSetNotification: ((notification: Notifications.Notification | null) => void) | null = null;
let globalSetGameEndNotification: ((data: GameEndNotificationData | null) => void) | null = null;

export function setGlobalNotificationSetters(
  setEventNotification: (data: EventNotificationData | null) => void,
  setNotification: (notification: Notifications.Notification | null) => void,
  setGameEndNotification: (data: GameEndNotificationData | null) => void,
) {
  globalSetEventNotification = setEventNotification;
  globalSetNotification = setNotification;
  globalSetGameEndNotification = setGameEndNotification;
}

// Configure how notifications are displayed when the app is in foreground
// Skip in Expo Go where remote notifications are not supported (SDK 53+)
if (!isExpoGo) Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown>;
    console.log('[Notifications] Foreground notification handled', {
      id: notification.request.identifier,
      data,
    });

    // Directly set the notification state
    if (globalSetNotification) {
      globalSetNotification(notification);
    }

    // Check if it's an EVENT notification and show modal
    if (data?.type === 'EVENT' && globalSetEventNotification) {
      const gameInstanceId =
        typeof data.gameInstanceId === 'number'
          ? data.gameInstanceId
          : Number(data.gameInstanceId);
      const eventId =
        typeof data.eventId === 'number' ? data.eventId : Number(data.eventId);

      if (Number.isNaN(gameInstanceId) || Number.isNaN(eventId)) {
        console.warn('[Notifications] Unable to parse event payload', data);
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      }
      globalSetEventNotification({
        type: 'EVENT',
        gameInstanceId,
        eventId,
        title: notification.request.content.title ?? undefined,
        body: notification.request.content.body ?? undefined,
      });
    } else if (data?.type === 'GAME_END' && globalSetGameEndNotification) {
      const gameInstanceId =
        typeof data.gameInstanceId === 'number'
          ? data.gameInstanceId
          : Number(data.gameInstanceId);

      if (!Number.isNaN(gameInstanceId)) {
        globalSetGameEndNotification({
          type: 'GAME_END',
          gameInstanceId,
          success: !!data.success,
          totalValue: Number(data.totalValue) || 0,
          title: notification.request.content.title ?? undefined,
          body: notification.request.content.body ?? undefined,
        });
      }
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

interface NotificationContextValue {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  eventNotification: EventNotificationData | null;
  clearEventNotification: () => void;
  gameEndNotification: GameEndNotificationData | null;
  clearGameEndNotification: () => void;
  registerForPushNotifications: () => Promise<string | null>;
  /** Manually trigger a pending event check (used by game screen as backup) */
  triggerPendingEventCheck: () => Promise<void>;
  pendingEventCompletion: number | null;
  setPendingEventCompletion: (gameInstanceId: number | null) => void;
  isOnAssetsScreen: boolean;
  setIsOnAssetsScreen: (value: boolean) => void;
  activeGameInstanceId: number | null;
  setActiveGameInstanceId: (gameInstanceId: number | null) => void;
  assetsScreenDepth: number;
  setAssetsScreenDepth: (depth: number | ((prev: number) => number)) => void;
  assetsScreenDepthRef: React.MutableRefObject<number>;
  pausedByAssets: boolean;
  setPausedByAssets: (paused: boolean) => void;
  shouldOpenAssetsSheet: boolean;
  setShouldOpenAssetsSheet: (value: boolean) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice || isExpoGo) {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId || projectId === 'your-project-id') {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
    return null;
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [eventNotification, setEventNotification] = useState<EventNotificationData | null>(null);
  const [gameEndNotification, setGameEndNotification] = useState<GameEndNotificationData | null>(null);
  const [pendingEventCompletion, setPendingEventCompletion] = useState<number | null>(null);
  const [isOnAssetsScreen, setIsOnAssetsScreen] = useState<boolean>(false);
  const [activeGameInstanceId, setActiveGameInstanceId] = useState<number | null>(null);
  const [assetsScreenDepth, setAssetsScreenDepthState] = useState<number>(0); // Track nested navigation (assets -> asset-detail)
  const assetsScreenDepthRef = useRef<number>(0); // Shared ref for immediate depth access
  const [pausedByAssets, setPausedByAssets] = useState<boolean>(false); // Track if we paused the game from assets screen
  const [shouldOpenAssetsSheet, setShouldOpenAssetsSheet] = useState<boolean>(false);
  const { user, isAuthenticated, authResolved } = useAuth();
  const hasCheckedPendingForUserRef = useRef<string | null>(null);

  // Wrapper that updates both state and ref
  const setAssetsScreenDepth = useCallback((depth: number | ((prev: number) => number)) => {
    setAssetsScreenDepthState((prev) => {
      const newDepth = typeof depth === 'function' ? depth(prev) : depth;
      assetsScreenDepthRef.current = newDepth;
      return newDepth;
    });
  }, []);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Configure channel for Android (skip in Expo Go)
  useEffect(() => {
    if (Platform.OS === 'android' && !isExpoGo) {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }
  }, []);

  // Register for push notifications and save token to backend
  const registerForPushNotifications = useCallback(async () => {
    const token = await registerForPushNotificationsAsync();

    if (token) {
      setExpoPushToken(token);

      if (authResolved && isAuthenticated && user) {
        try {
          await trpcClient.user.updateExpoPushToken.mutate({ expoPushToken: token });
        } catch (error) {
          console.error('[Notifications] Failed to save token to backend:', error);
        }
      }
    }

    return token;
  }, [authResolved, isAuthenticated, user]);

  // Register on mount when authenticated
  useEffect(() => {
    if (authResolved && isAuthenticated) {
      registerForPushNotifications();
    }
  }, [authResolved, isAuthenticated, registerForPushNotifications]);

  // Re-register push token when the app returns to the foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && authResolved && isAuthenticated && !expoPushToken) {
        registerForPushNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [authResolved, expoPushToken, isAuthenticated, registerForPushNotifications]);

  // One-shot fallback check after login in case a notification was missed.
  const checkPendingEvent = useCallback(async (): Promise<EventNotificationData | null> => {
    // Don't check if:
    // - Not authenticated
    // - Already showing an event notification
    // - Already have a pending event completion (user clicked "Plus tard" or "Voir mes assets")
    // Note: we no longer block polling on assets screen — the modal overlays everything
    if (!authResolved || !isAuthenticated || eventNotification || pendingEventCompletion) {
      return null;
    }

    try {
      const pendingEvent = await trpcClient.auth.getPendingEvent.query();
      if (pendingEvent) {
        const eventData = {
          type: 'EVENT',
          gameInstanceId: pendingEvent.gameInstanceId,
          eventId: pendingEvent.eventId,
          title: pendingEvent.title,
          body: pendingEvent.body,
        } satisfies EventNotificationData;
        console.log('[Notifications] Found pending event via fallback check:', pendingEvent);
        setEventNotification(eventData);
        return eventData;
      }
    } catch (error) {
      console.error('[Notifications] Error checking pending event:', error);
    }

    return null;
  }, [authResolved, isAuthenticated, eventNotification, pendingEventCompletion]);

  // One-shot fallback check after login for unseen GAME_END notifications.
  const checkPendingGameEnd = useCallback(async (): Promise<GameEndNotificationData | null> => {
    if (!authResolved || !isAuthenticated || gameEndNotification) {
      return null;
    }

    try {
      const pendingGameEnd = await trpcClient.auth.getPendingGameEnd.query();
      if (pendingGameEnd) {
        const gameEndData = {
          type: 'GAME_END',
          gameInstanceId: pendingGameEnd.gameInstanceId,
          success: false,
          totalValue: 0,
        } satisfies GameEndNotificationData;
        console.log('[Notifications] Found pending game end via fallback check:', pendingGameEnd);
        setGameEndNotification(gameEndData);
        return gameEndData;
      }
    } catch (error) {
      console.error('[Notifications] Error checking pending game end:', error);
    }

    return null;
  }, [authResolved, isAuthenticated, gameEndNotification]);

  // Forced event check — bypasses guards, used by game screen as direct backup detection
  const triggerPendingEventCheck = useCallback(async () => {
    // Only skip if already showing a notification or pending completion
    if (eventNotification || pendingEventCompletion) {
      console.log('[Notifications] ⏭️ triggerCheck skipped:', { hasEvent: !!eventNotification, hasPending: !!pendingEventCompletion });
      return;
    }

    try {
      console.log('[Notifications] 🔍 triggerPendingEventCheck calling getPendingEvent...');
      const pendingEvent = await trpcClient.auth.getPendingEvent.query();
      console.log('[Notifications] 🔍 triggerPendingEventCheck result:', pendingEvent);
      if (pendingEvent) {
        console.log('[Notifications] 🔔 FOUND EVENT! Setting notification:', pendingEvent);
        setEventNotification({
          type: 'EVENT',
          gameInstanceId: pendingEvent.gameInstanceId,
          eventId: pendingEvent.eventId,
          title: pendingEvent.title,
          body: pendingEvent.body,
        });
      }
    } catch (error) {
      console.error('[Notifications] ❌ triggerPendingEventCheck error:', error);
    }
  }, [eventNotification, pendingEventCompletion]);

  useEffect(() => {
    if (!authResolved) {
      return;
    }

    if (!isAuthenticated || !user) {
      hasCheckedPendingForUserRef.current = null;
      return;
    }

    if (hasCheckedPendingForUserRef.current === user.id) {
      return;
    }

    hasCheckedPendingForUserRef.current = user.id;

    void (async () => {
      const pendingEvent = await checkPendingEvent();
      if (!pendingEvent && !eventNotification && !gameEndNotification) {
        await checkPendingGameEnd();
      }
    })();
  }, [
    authResolved,
    isAuthenticated,
    user,
    eventNotification,
    gameEndNotification,
    checkPendingEvent,
    checkPendingGameEnd,
  ]);

  // Register global setters so the handler can update state directly
  useEffect(() => {
    setGlobalNotificationSetters(setEventNotification, setNotification, setGameEndNotification);
    return () => {
      setGlobalNotificationSetters(() => {}, () => {}, () => {});
    };
  }, [setEventNotification, setNotification, setGameEndNotification]);

  // Handle incoming notifications from listeners
  const handleIncomingNotification = useCallback((notification: Notifications.Notification) => {
    setNotification(notification);

    const data = notification.request.content.data as Record<string, unknown>;
    console.log('[Notifications] Notification received', {
      id: notification.request.identifier,
      data,
    });

    if (data?.type === 'EVENT') {
      const gameInstanceId =
        typeof data.gameInstanceId === 'number'
          ? data.gameInstanceId
          : Number(data.gameInstanceId);
      const eventId =
        typeof data.eventId === 'number' ? data.eventId : Number(data.eventId);

      if (Number.isNaN(gameInstanceId) || Number.isNaN(eventId)) {
        console.warn('[Notifications] Unable to parse event payload', data);
        return;
      }

      setEventNotification({
        type: 'EVENT',
        gameInstanceId,
        eventId,
        title: notification.request.content.title ?? undefined,
        body: notification.request.content.body ?? undefined,
      });
    } else if (data?.type === 'GAME_END') {
      const gameInstanceId =
        typeof data.gameInstanceId === 'number'
          ? data.gameInstanceId
          : Number(data.gameInstanceId);

      if (!Number.isNaN(gameInstanceId)) {
        setGameEndNotification({
          type: 'GAME_END',
          gameInstanceId,
          success: !!data.success,
          totalValue: Number(data.totalValue) || 0,
          title: notification.request.content.title ?? undefined,
          body: notification.request.content.body ?? undefined,
        });
      }
    }
  }, [setNotification, setEventNotification, setGameEndNotification]);

  // Handle incoming notifications (skip in Expo Go)
  useEffect(() => {
    if (isExpoGo) return;

    // Notification received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      handleIncomingNotification(notification);
    });

    // Notification clicked/tapped (when app is in background or closed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleIncomingNotification(response.notification);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleIncomingNotification]);

  const clearEventNotification = useCallback(() => {
    setEventNotification(null);
  }, []);

  const clearGameEndNotification = useCallback(() => {
    setGameEndNotification(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        eventNotification,
        clearEventNotification,
        gameEndNotification,
        clearGameEndNotification,
        registerForPushNotifications,
        triggerPendingEventCheck,
        pendingEventCompletion,
        setPendingEventCompletion,
        isOnAssetsScreen,
        setIsOnAssetsScreen,
        activeGameInstanceId,
        setActiveGameInstanceId,
        assetsScreenDepth,
        setAssetsScreenDepth,
        assetsScreenDepthRef,
        pausedByAssets,
        setPausedByAssets,
        shouldOpenAssetsSheet,
        setShouldOpenAssetsSheet,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

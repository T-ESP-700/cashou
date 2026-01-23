import { useState, useEffect, useRef, useCallback, createContext, useContext, type ReactNode } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

export interface EventNotificationData {
  type: 'EVENT';
  gameInstanceId: number;
  eventId: number;
  title?: string;
  body?: string;
}

// Global setters to allow the notification handler (outside component) to update state
// This is necessary because Notifications.setNotificationHandler runs at module initialization
let globalSetEventNotification: ((data: EventNotificationData | null) => void) | null = null;
let globalSetNotification: ((notification: Notifications.Notification | null) => void) | null = null;

export function setGlobalNotificationSetters(
  setEventNotification: (data: EventNotificationData | null) => void,
  setNotification: (notification: Notifications.Notification | null) => void,
) {
  globalSetEventNotification = setEventNotification;
  globalSetNotification = setNotification;
}

// Configure how notifications are displayed when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown>;
    console.log('[Notifications] Foreground notification handled', {
      id: notification.request.identifier,
      data,
    });

    // Directly set the notification state via global setter
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
  registerForPushNotifications: () => Promise<string | null>;
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
  if (!Device.isDevice) {
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
  const [pendingEventCompletion, setPendingEventCompletion] = useState<number | null>(null);
  const [isOnAssetsScreen, setIsOnAssetsScreen] = useState<boolean>(false);
  const [activeGameInstanceId, setActiveGameInstanceId] = useState<number | null>(null);
  const [assetsScreenDepth, setAssetsScreenDepthState] = useState<number>(0);
  const assetsScreenDepthRef = useRef<number>(0);
  const [pausedByAssets, setPausedByAssets] = useState<boolean>(false);
  const { user, isAuthenticated } = useAuth();

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
  const tokenSentRef = useRef<string | null>(null); // Track last sent token to prevent duplicates

  // Configure channel for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
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

      // Only send to backend if:
      // - User is authenticated
      // - Token hasn't been sent yet OR token changed
      if (isAuthenticated && user && tokenSentRef.current !== token) {
        try {
          // Use vanilla client to avoid mutation reference issues
          await trpcClient.user.updateExpoPushToken.mutate({ expoPushToken: token });
          tokenSentRef.current = token; // Mark as sent
          console.log('[Notifications] Push token saved to backend');
        } catch (error) {
          console.error('[Notifications] Failed to save token to backend:', error);
        }
      }
    }

    return token;
  }, [isAuthenticated, user]); // Removed updatePushTokenMutation - uses vanilla client instead

  // Reset token sent ref when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      tokenSentRef.current = null;
    }
  }, [isAuthenticated]);

  // Register on mount when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
    }
  }, [isAuthenticated, registerForPushNotifications]);

  // Re-register push token when the app returns to the foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated && !expoPushToken) {
        registerForPushNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [expoPushToken, isAuthenticated, registerForPushNotifications]);

  // Check for pending events on app launch and when returning to foreground
  // This is a fallback for when push notification didn't trigger properly
  const checkPendingEvent = useCallback(async () => {
    // Don't check if:
    // - Not authenticated
    // - Already showing an event notification
    // - Already have a pending event completion
    // - Currently on assets screen
    if (!isAuthenticated || eventNotification || pendingEventCompletion || assetsScreenDepthRef.current > 0) {
      console.log('[Notifications] Skipping pending event check:', {
        isAuthenticated,
        hasEventNotification: !!eventNotification,
        hasPendingCompletion: !!pendingEventCompletion,
        assetsScreenDepth: assetsScreenDepthRef.current,
      });
      return;
    }

    try {
      // Use vanilla client for this check since it's called from effects
      const pendingEvent = await trpcClient.auth.getPendingEvent.query();
      if (pendingEvent) {
        console.log('[Notifications] Found pending event via fallback check:', pendingEvent);
        setEventNotification({
          type: 'EVENT',
          gameInstanceId: pendingEvent.gameInstanceId,
          eventId: pendingEvent.eventId,
          title: pendingEvent.title,
          body: pendingEvent.body,
        });
      }
    } catch (error) {
      console.error('[Notifications] Error checking pending event:', error);
    }
  }, [isAuthenticated, eventNotification, pendingEventCompletion]);

  // Check for pending events on initial mount when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const timeoutId = setTimeout(() => {
        checkPendingEvent();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, checkPendingEvent]);

  // Check for pending events when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        setTimeout(() => {
          checkPendingEvent();
        }, 500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, checkPendingEvent]);

  // Register global setters so the notification handler can update state directly
  useEffect(() => {
    setGlobalNotificationSetters(setEventNotification, setNotification);
    return () => {
      setGlobalNotificationSetters(() => {}, () => {});
    };
  }, []);

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
    }
  }, []);

  // Handle incoming notifications
  useEffect(() => {
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

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        eventNotification,
        clearEventNotification,
        registerForPushNotifications,
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

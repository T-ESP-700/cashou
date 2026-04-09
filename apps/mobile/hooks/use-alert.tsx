import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { ActionPillButton } from '@/components/ui';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type ShowAlertFn = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
) => void;

type AlertContextValue = {
  showAlert: ShowAlertFn;
};

const AlertContext = createContext<AlertContextValue>({
  showAlert: Alert.alert,
});

let globalShowAlert: ShowAlertFn | null = null;

const INITIAL_STATE: AlertState = {
  visible: false,
  title: '',
  message: undefined,
  buttons: [],
};

function getAlertIcon(title: string, buttons: AlertButton[]): {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: 'error' | 'success' | 'accent';
} {
  const hasDestructive = buttons.some((b) => b.style === 'destructive');
  const lowerTitle = title.toLowerCase();

  if (hasDestructive || lowerTitle.includes('erreur') || lowerTitle.includes('error') || lowerTitle.includes('failed')) {
    return { name: 'alert-circle', color: 'error' };
  }
  if (lowerTitle.includes('succès') || lowerTitle.includes('succes') || lowerTitle.includes('effectué') || lowerTitle.includes('success')) {
    return { name: 'checkmark-circle', color: 'success' };
  }
  if (buttons.some((b) => b.style === 'cancel')) {
    return { name: 'help-circle', color: 'accent' };
  }
  return { name: 'information-circle', color: 'accent' };
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<AlertState>(INITIAL_STATE);
  const queue = useRef<AlertState[]>([]);
  const { colors, status, isDark } = useCashouTheme();

  const showNext = useCallback(() => {
    if (queue.current.length > 0) {
      setCurrent(queue.current.shift()!);
    } else {
      setCurrent(INITIAL_STATE);
    }
  }, []);

  const showAlert: ShowAlertFn = useCallback(
    (title, message, buttons) => {
      const state: AlertState = {
        visible: true,
        title,
        message,
        buttons: buttons || [{ text: 'OK' }],
      };

      setCurrent((prev) => {
        if (prev.visible) {
          queue.current.push(state);
          return prev;
        }
        return state;
      });
    },
    [],
  );

  useEffect(() => {
    globalShowAlert = showAlert;
    return () => {
      globalShowAlert = null;
    };
  }, [showAlert]);

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      setCurrent(INITIAL_STATE);
      button.onPress?.();
      setTimeout(showNext, 150);
    },
    [showNext],
  );

  const handleDismiss = useCallback(() => {
    const cancelButton = current.buttons.find((b) => b.style === 'cancel');
    setCurrent(INITIAL_STATE);
    cancelButton?.onPress?.();
    setTimeout(showNext, 150);
  }, [current.buttons, showNext]);

  const iconInfo = getAlertIcon(current.title, current.buttons);
  const iconColor = iconInfo.color === 'error' ? status.error
    : iconInfo.color === 'success' ? status.success
    : colors.accent;

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
          visible={current.visible}
          transparent
          animationType="fade"
          onRequestClose={handleDismiss}
          statusBarTranslucent
        >
          <BlurView
            intensity={60}
            tint={isDark ? 'dark' : 'light'}
            style={styles.blur}
          >
            <Pressable style={styles.overlay} onPress={handleDismiss}>
              <View
                onStartShouldSetResponder={() => true}
                style={[styles.cardBackdrop, { backgroundColor: colors.secondary }]}
              >
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.border }]}>
                  <View style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}>
                    <Ionicons name={iconInfo.name} size={40} color={iconColor} />
                  </View>

                  <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
                    {current.title}
                  </Text>

                  {current.message && (
                    <Text allowFontScaling={false} style={[styles.description, { color: colors.text }]}>
                      {current.message}
                    </Text>
                  )}

                  <View style={styles.actions}>
                    {current.buttons.map((button, index) => (
                      <ActionPillButton
                        key={index}
                        label={button.text || 'OK'}
                        iconName={
                          button.style === 'cancel' ? 'close' :
                          button.style === 'destructive' ? 'trash' :
                          'checkmark'
                        }
                        onPress={() => handleButtonPress(button)}
                        style={{ flex: 1 }}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </Pressable>
          </BlurView>
        </Modal>
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextValue {
  return useContext(AlertContext);
}

export function cashouAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
) {
  if (globalShowAlert) {
    globalShowAlert(title, message, buttons);
    return;
  }
  // Fallback to native if provider not mounted yet
  Alert.alert(title, message, buttons);
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
});

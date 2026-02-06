import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

interface CashouHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onMenuPress?: () => void;
  onBackPress?: () => void;
}

export function CashouHeader({
  title = 'Cashou',
  showBackButton = true,
  onMenuPress,
  onBackPress,
}: CashouHeaderProps) {
  const router = useRouter();
  const { colors, isDark, spacing } = useCashouTheme();
  const insets = useSafeAreaInsets();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const iconColor = isDark ? '#FFFFFF' : '#1C1E33';
  const floatingBg = isDark ? 'rgba(42, 45, 69, 0.92)' : 'rgba(255, 255, 255, 0.92)';
  const floatingBorder = isDark ? 'rgba(58, 61, 85, 0.6)' : 'rgba(0, 0, 0, 0.08)';
  const pillBg = colors.primary;
  const pillTextColor = isDark ? '#FFFFFF' : '#1C1E33';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
      ]}
    >
      <View style={styles.row}>
        {/* Back Button */}
        {showBackButton ? (
          <TouchableOpacity
            onPress={handleBackPress}
            activeOpacity={0.7}
            style={[
              styles.floatingButton,
              {
                backgroundColor: floatingBg,
                borderColor: floatingBorder,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonPlaceholder} />
        )}

        {/* Title Pill */}
        <View
          style={[
            styles.titlePill,
            {
              backgroundColor: pillBg,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          <Text
            style={[
              styles.titleText,
              { color: pillTextColor },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Menu Button */}
        <TouchableOpacity
          onPress={onMenuPress}
          activeOpacity={0.7}
          style={[
            styles.floatingButton,
            {
              backgroundColor: floatingBg,
              borderColor: floatingBorder,
            },
          ]}
        >
          <Ionicons name="menu" size={22} color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BUTTON_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonPlaceholder: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  titlePill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  titleText: {
    fontSize: 16,
    fontFamily: 'Rowdies',
    fontWeight: '400',
    textAlign: 'center',
  },
});

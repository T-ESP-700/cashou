import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CashouLogoLight from '@/assets/images/cashou_logo_light.svg';
import CashouLogoDark from '@/assets/images/cashou_logo_dark.svg';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

interface CashouHeaderProps {
  showBackButton?: boolean;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  additionalTopPadding?: number;
}

export function CashouHeader({
  showBackButton = true,
  onMenuPress,
  onBackPress,
  additionalTopPadding = 0,
}: CashouHeaderProps) {
  const router = useRouter();
  const { colors, special, spacing, isDark } = useCashouTheme();
  const insets = useSafeAreaInsets();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const iconColor = isDark ? special.white : special.darkText;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primary,
        paddingTop: insets.top + additionalTopPadding,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
      }}
    >
      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBackPress}
        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        disabled={!showBackButton}
      >
        {showBackButton && (
          <Ionicons name="chevron-back" size={28} color={iconColor} />
        )}
      </TouchableOpacity>

      {/* Logo */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        {isDark ? (
          <CashouLogoDark width={120} height={40} />
        ) : (
          <CashouLogoLight width={120} height={40} />
        )}
      </View>

      {/* Menu Button */}
      <TouchableOpacity
        onPress={onMenuPress}
        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="menu" size={28} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
}

import { View, TouchableOpacity, useColorScheme as useRNColorScheme, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CashouLogoLight from '@/assets/images/cashou_logo_light.svg';
import CashouLogoDark from '@/assets/images/cashou_logo_dark.svg';
import { CashouTheme } from '@/constants/cashou-theme';

interface CashouHeaderProps {
  showBackButton?: boolean;
  onMenuPress?: () => void;
  onBackPress?: () => void;
}

export function CashouHeader({
  showBackButton = true,
  onMenuPress,
  onBackPress
}: CashouHeaderProps) {
  const router = useRouter();
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBackPress}
        style={styles.button}
        disabled={!showBackButton}
      >
        {showBackButton && (
          <Ionicons
            name="chevron-back"
            size={28}
            color={isDark ? '#FFFFFF' : '#1C1E33'}
          />
        )}
      </TouchableOpacity>

      {/* Logo */}
      <View style={styles.logoContainer}>
        {isDark ? (
          <CashouLogoDark width={120} height={40} />
        ) : (
          <CashouLogoLight width={120} height={40} />
        )}
      </View>

      {/* Menu Button */}
      <TouchableOpacity
        onPress={onMenuPress}
        style={styles.button}
      >
        <Ionicons
          name="menu"
          size={28}
          color={isDark ? '#FFFFFF' : '#1C1E33'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
});

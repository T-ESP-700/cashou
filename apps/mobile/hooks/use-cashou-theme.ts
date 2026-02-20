/**
 * Custom hook for accessing Cashou theme values
 * Provides a centralized way to access theme colors, spacing, and other tokens
 */

import {
  CashouTheme,
  CashouStatusColors,
  CashouIconColors,
  CashouOverlayColors,
  CashouSpecialColors,
  CashouSpacing,
  CashouBorderRadius,
} from '@/constants/cashou-theme';
import { useThemePreference } from '@/hooks/use-theme-provider';

export type ThemeMode = 'light' | 'dark';

// Define the extended colors interface with string types for flexibility
export interface CashouThemeColorsExtended {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  card: string;
  border: string;
  borderLight: string;
  progressBarBackground: string;
  icon: string;
  iconMuted: string;
  iconActive: string;
}

export interface UseCashouThemeReturn {
  /** Current theme mode ('light' or 'dark') */
  mode: ThemeMode;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Mode-specific colors (primary, secondary, background, text, etc.) */
  colors: CashouThemeColorsExtended;
  /** Semantic status colors (success, error, warning, info) */
  status: CashouStatusColors;
  /** Icon colors */
  icon: CashouIconColors;
  /** Overlay colors for modals and backdrops */
  overlay: CashouOverlayColors;
  /** Special colors (streak, gold, white, darkText) */
  special: CashouSpecialColors;
  /** Font family definitions */
  fonts: typeof CashouTheme.fonts;
  /** Spacing values (xs, sm, md, lg, xl) */
  spacing: CashouSpacing;
  /** Border radius values (sm, md, lg, xl) */
  borderRadius: CashouBorderRadius;
  /** Border width values (thin, medium, thick) */
  borderWidth: typeof CashouTheme.borderWidth;
  /** Button style presets */
  button: typeof CashouTheme.button;
  /** Full theme object for advanced usage */
  theme: typeof CashouTheme;
}

/**
 * Hook to access Cashou theme values based on current color scheme
 *
 * @example
 * ```tsx
 * const { colors, status, spacing } = useCashouTheme();
 *
 * return (
 *   <View style={{ backgroundColor: colors.background, padding: spacing.md }}>
 *     <Text style={{ color: status.success }}>Success!</Text>
 *   </View>
 * );
 * ```
 */
export function useCashouTheme(): UseCashouThemeReturn {
  const { resolved, isDark } = useThemePreference();
  const mode: ThemeMode = resolved;

  const modeColors = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  const colors: CashouThemeColorsExtended = {
    ...modeColors,
    icon: isDark ? CashouTheme.colors.icon.dark : CashouTheme.colors.icon.light,
    iconMuted: CashouTheme.colors.icon.muted,
    iconActive: CashouTheme.colors.icon.active,
  };

  return {
    mode,
    isDark,
    colors,
    status: CashouTheme.colors.status,
    icon: CashouTheme.colors.icon,
    overlay: CashouTheme.colors.overlay,
    special: CashouTheme.colors.special,
    fonts: CashouTheme.fonts,
    spacing: CashouTheme.spacing,
    borderRadius: CashouTheme.borderRadius,
    borderWidth: CashouTheme.borderWidth,
    button: CashouTheme.button,
    theme: CashouTheme,
  };
}

/**
 * Helper function to get theme colors without hook (for non-component contexts)
 * Note: This doesn't react to theme changes, use useCashouTheme in components
 */
export function getStaticThemeColors(mode: ThemeMode = 'light') {
  const isDark = mode === 'dark';
  const modeColors = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  return {
    ...modeColors,
    icon: isDark ? CashouTheme.colors.icon.dark : CashouTheme.colors.icon.light,
    iconMuted: CashouTheme.colors.icon.muted,
    iconActive: CashouTheme.colors.icon.active,
  };
}

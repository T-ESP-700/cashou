/**
 * Cashou App Theme Configuration
 * Defines colors, fonts, and styling tokens for the Cashou application
 */

export const CashouTheme = {
  colors: {
    // Mode-specific colors
    light: {
      primary: "#FFB472",
      secondary: "#F0E8E3",
      background: "#F4F4F9",
      text: "#1C1E33",
      accent: "#FFB472",
      card: "#FFFFFF",
      border: "#1C1E33",
      progressBarBackground: "#E0E0E0",
    },
    dark: {
      primary: "#172D4E",
      secondary: "#172D4E",
      background: "#1C1E33",
      text: "#FFFFFF",
      accent: "#FFB472",
      card: "#2A2D45",
      border: "#3A3D55",
      progressBarBackground: "#3A3D55",
    },
    // Semantic status colors (mode-agnostic)
    status: {
      success: "#4CAF50",
      successLight: "#4CAF5020",
      error: "#F44336",
      errorLight: "#F4433620",
      errorDark: "#D32F2F",
      warning: "#FF9800",
      warningLight: "#FF980020",
      info: "#2196F3",
      infoLight: "#2196F320",
      neutral: "#9E9E9E",
    },
    // Icon colors
    icon: {
      light: "#687076",
      dark: "#9BA1A6",
      muted: "#9CA3AF",
      active: "#E87F00",
    },
    // Overlay colors
    overlay: {
      dark: "rgba(0, 0, 0, 0.5)",
      medium: "rgba(0, 0, 0, 0.3)",
      light: "rgba(0, 0, 0, 0.1)",
      white: "rgba(255, 255, 255, 0.2)",
    },
    // Special colors
    special: {
      streak: "#E87F00",
      streakLight: "#E87F0020",
      gold: "#FFD700",
      goldLight: "#FFD70020",
      white: "#FFFFFF",
      darkText: "#1C1E33",
    },
  },
  fonts: {
    heading: "Rowdies", // For H1 titles
    subheading: "Roboto-Bold", // For H2 titles
    body: "Roboto", // For body text
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  borderWidth: {
    thin: 1,
    medium: 2,
    thick: 4,
  },
  button: {
    primary: {
      paddingVertical: 18,
      paddingHorizontal: 24,
      borderRadius: 26,
      borderWidth: 2,
      alignItems: 'center' as const,
      alignSelf: 'flex-end' as const,
      activeOpacity: 0.8,
      text: {
        fontSize: 18,
      },
    },
  },
} as const;

// Type exports
export type CashouThemeColors = typeof CashouTheme.colors.light;
export type CashouStatusColors = typeof CashouTheme.colors.status;
export type CashouIconColors = typeof CashouTheme.colors.icon;
export type CashouOverlayColors = typeof CashouTheme.colors.overlay;
export type CashouSpecialColors = typeof CashouTheme.colors.special;
export type CashouSpacing = typeof CashouTheme.spacing;
export type CashouBorderRadius = typeof CashouTheme.borderRadius;

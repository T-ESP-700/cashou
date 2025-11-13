/**
 * Cashou App Theme Configuration
 * Defines colors, fonts, and styling tokens for the Cashou application
 */

export const CashouTheme = {
  colors: {
    light: {
      primary: '#FFB472',
      secondary: '#EAD8CD',
      background: '#F4F4F9',
      text: '#1C1E33',
      accent: '#FFB472',
      card: '#FFFFFF',
      border: '#E0E0E0',
    },
    dark: {
      primary: '#172D4E',
      secondary: '#172D4E',
      background: '#1C1E33',
      text: '#FFFFFF',
      accent: '#FFB472',
      card: '#2A2D45',
      border: '#3A3D55',
    },
  },
  fonts: {
    heading: 'Rowdies', // For H1 titles
    subheading: 'Roboto-Bold', // For H2 titles
    body: 'Roboto', // For body text
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
} as const;

export type CashouThemeColors = typeof CashouTheme.colors.light;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mode-specific colors (synced with CashouTheme)
        primary: {
          light: '#FFB472',
          dark: '#172D4E',
          DEFAULT: '#FFB472',
        },
        secondary: {
          light: '#F0E8E3',
          dark: '#172D4E',
          DEFAULT: '#F0E8E3',
        },
        background: {
          light: '#F4F4F9',
          dark: '#1C1E33',
          DEFAULT: '#F4F4F9',
        },
        text: {
          light: '#1C1E33',
          dark: '#FFFFFF',
          DEFAULT: '#1C1E33',
        },
        accent: '#FFB472',
        card: {
          light: '#FFFFFF',
          dark: '#2A2D45',
          DEFAULT: '#FFFFFF',
        },
        border: {
          light: '#1C1E33',
          dark: '#3A3D55',
          DEFAULT: '#1C1E33',
        },
        // Status colors (semantic, mode-agnostic)
        success: {
          DEFAULT: '#4CAF50',
          light: '#4CAF5020',
        },
        error: {
          DEFAULT: '#F44336',
          light: '#F4433620',
          dark: '#D32F2F',
        },
        warning: {
          DEFAULT: '#FF9800',
          light: '#FF980020',
        },
        info: {
          DEFAULT: '#2196F3',
          light: '#2196F320',
        },
        neutral: '#9E9E9E',
        // Icon colors
        icon: {
          light: '#687076',
          dark: '#9BA1A6',
          muted: '#9CA3AF',
          active: '#E87F00',
        },
        // Special colors
        streak: {
          DEFAULT: '#E87F00',
          light: '#E87F0020',
        },
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFD70020',
        },
        darkText: '#1C1E33',
      },
      fontFamily: {
        rowdies: ['Rowdies', 'sans-serif'],
        robotoBold: ['Roboto-Bold', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      // Custom spacing (synced with CashouTheme.spacing)
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
      },
      // Custom border radius (synced with CashouTheme.borderRadius)
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
    },
  },
  plugins: [],
};

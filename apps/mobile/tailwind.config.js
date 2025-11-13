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
        primary: {
          light: '#FFB472',
          dark: '#172D4E',
          DEFAULT: '#FFB472',
        },
        secondary: {
          light: '#EAD8CD',
          dark: '#172D4E',
          DEFAULT: '#EAD8CD',
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
      },
      fontFamily: {
        rowdies: ['Rowdies', 'sans-serif'],
        robotoBold: ['Roboto-Bold', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

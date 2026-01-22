/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cashou: {
          primary: '#FFB472',
          secondary: '#F0E8E3',
          accent: '#FFB472',
          background: {
            light: '#F4F4F9',
            dark: '#1C1E33',
          },
          text: {
            light: '#1C1E33',
            dark: '#FFFFFF',
          },
          card: {
            light: '#FFFFFF',
            dark: '#2A2D45',
          },
          border: {
            light: '#1C1E33',
            dark: '#3A3D55',
          },
          status: {
            success: '#4CAF50',
            error: '#F44336',
            warning: '#FF9800',
            info: '#2196F3',
          },
          streak: '#E87F00',
          gold: '#FFD700',
        },
      },
      fontFamily: {
        heading: ['Rowdies', 'cursive'],
        body: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


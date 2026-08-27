/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0A0A0F',
          secondary: '#0F0F1A',
        },
        surface: {
          DEFAULT: '#1A1A2E',
          elevated: '#232340',
        },
        primary: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          dark: '#6D28D9',
        },
        accent: {
          pink: '#EC4899',
          magenta: '#D946EF',
          cyan: '#06B6D4',
        },
        border: {
          DEFAULT: '#2A2A3E',
          light: '#3A3A52',
        },
      },
    },
  },
  plugins: [],
};

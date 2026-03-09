/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 啟用 class 模式的深色模式
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand: deep ocean-blue — distinct from generic blue-600
        brand: {
          light:   '#e8f0f7',
          DEFAULT: '#1e5c8a',
          dark:    '#153f62',
          50:  '#e8f0f7',
          100: '#c5d9ed',
          200: '#96bade',
          300: '#5f97cc',
          400: '#3378b5',
          500: '#1e5c8a',
          600: '#184f79',
          700: '#153f62',
          800: '#0f2d47',
          900: '#081b2c',
        },
        // Warmer neutral surface — replaces default gray-50/100
        surface: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        // Keep danger / warning for status colours
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        }
      }
    },
  },
  plugins: [],
} 
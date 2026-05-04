/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        navy: { 900: '#0f0f1a', 800: '#16213e', 700: '#1a1a2e' },
        accent: { DEFAULT: '#6c63ff', light: '#a89cff' },
        success: '#22c55e',
        danger: '#ef4444',
        warn: '#f59e0b',
      },
    },
  },
  plugins: [],
}

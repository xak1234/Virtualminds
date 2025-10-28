/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        '2xs': '360px',
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
      },
      colors: {
        // Dark theme colors
        'base-900': '#0d1117',
        'base-800': '#161b22',
        'base-700': '#21262d',
        'base-600': '#30363d',
        'base-500': '#484f58',
        'primary': '#2f81f7',
        'accent': '#58a6ff',
        'terminal': '#4ade80',
        
        // Light theme colors
        'light-bg': '#ffffff',
        'light-panel': '#f0f2f5',
        'light-border': '#d0d7de',
        'light-text': '#24292f',
        'light-text-secondary': '#57606a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    }
  },
  plugins: [],
}


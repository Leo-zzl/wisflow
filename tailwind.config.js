/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rust: {
          50: '#fdf3ef',
          100: '#fbe0d5',
          200: '#f6bfaa',
          300: '#ef9475',
          400: '#e6603d',
          500: '#d4411e',
          600: '#b7410e',
          700: '#8f310b',
          800: '#732a0f',
          900: '#5e2510',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      animation: {
        'mic-pulse': 'mic-pulse 1.5s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'mic-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '1',
            boxShadow: '0 0 0 0 rgba(183, 65, 14, 0.55)',
          },
          '50%': {
            transform: 'scale(1.12)',
            opacity: '0.9',
            boxShadow: '0 0 0 14px rgba(183, 65, 14, 0)',
          },
        },
      },
    },
  },
  plugins: [],
};

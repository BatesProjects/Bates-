import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Space Mono', 'Courier New', 'monospace'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: {
          50: '#FDFAF4',
          100: '#F7F1E6',
          200: '#EFE5CC',
          300: '#E2D9C8',
          400: '#CEC4B2',
        },
        charcoal: {
          900: '#1C1916',
          800: '#272420',
          700: '#3A3630',
          600: '#5C5750',
        },
        stone: {
          500: '#8A7F70',
          400: '#A89E8C',
          300: '#C4BAA8',
        },
        job: {
          active: '#4A7C59',
          'active-bg': '#EBF4EE',
          scheduled: '#4A6B8A',
          'scheduled-bg': '#EBF1F7',
          complete: '#8A8478',
          'complete-bg': '#F0EDEA',
          urgent: '#B85C4A',
          'urgent-bg': '#FAF0EE',
        },
      },
    },
  },
  plugins: [],
}

export default config

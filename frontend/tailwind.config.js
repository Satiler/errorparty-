/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ErrorParty brand colors
        dark: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
          lighter: '#0f3460'
        },
        light: {
          DEFAULT: '#f8f9fa',
          dark: '#e9ecef',
          darker: '#dee2e6'
        },
        neon: {
          cyan: '#00fff5',
          pink: '#ff006e',
          purple: '#8338ec',
          yellow: '#ffbe0b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        glow: {
          'from': {
            textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #00fff5, 0 0 40px #00fff5'
          },
          'to': {
            textShadow: '0 0 20px #fff, 0 0 30px #ff006e, 0 0 40px #ff006e, 0 0 50px #ff006e'
          }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        creeper: {
          light: '#7CB342',
          DEFAULT: '#558B2F',
          dark: '#33691E',
        },
        diamond: '#4DD0E1',
        neon: {
          green: '#39FF14',
          blue: '#00F5FF',
          pink: '#FF00FF',
        },
        terminal: {
          bg: '#0D0D0D',
          text: '#00FF00',
        }
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'matrix-fall': 'matrixFall 20s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'flicker': 'flicker 0.15s infinite',
        'pixel-bounce': 'pixelBounce 0.5s ease-in-out',
      },
      keyframes: {
        matrixFall: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glow: {
          '0%': { textShadow: '0 0 5px #00FF00, 0 0 10px #00FF00, 0 0 15px #00FF00' },
          '100%': { textShadow: '0 0 10px #00FF00, 0 0 20px #00FF00, 0 0 30px #00FF00, 0 0 40px #00FF00' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        pixelBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'neon': '0 0 5px theme(colors.neon.green), 0 0 20px theme(colors.neon.green)',
        'neon-blue': '0 0 5px theme(colors.diamond), 0 0 20px theme(colors.diamond)',
      }
    },
  },
  plugins: [],
}

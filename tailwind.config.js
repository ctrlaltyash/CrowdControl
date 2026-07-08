/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          deep: '#020203',
          base: '#050506',
          elevated: '#0a0a0c',
        },
        surface: {
          DEFAULT: 'rgba(255,255,255,0.05)',
          hover: 'rgba(255,255,255,0.08)',
        },
        foreground: {
          DEFAULT: '#EDEDEF',
          muted: '#8A8F98',
          subtle: 'rgba(255,255,255,0.60)',
        },
        accent: {
          DEFAULT: '#5E6AD2',
          bright: '#6872D9',
          soft: 'rgba(94,106,210,0.14)',
          glow: 'rgba(94,106,210,0.30)',
        },
        border: {
          default: 'rgba(255,255,255,0.06)',
          hover: 'rgba(255,255,255,0.10)',
          accent: 'rgba(94,106,210,0.30)',
        },
        void: {
          950: '#050506',
          900: '#0a0a0c',
          800: '#131318',
          700: '#23242b',
        },
        neon: {
          pink: '#6872D9',
          cyan: '#5E6AD2',
          green: '#65D994',
          purple: '#7C83E6',
        },
        hazard: {
          low: '#65D994',
          mid: '#E6C662',
          high: '#F59F52',
          crit: '#FF5C72',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'Geist Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-pink': '0 0 0 1px rgba(104,114,217,0.42), 0 8px 30px rgba(94,106,210,0.18)',
        'glow-cyan': '0 0 0 1px rgba(94,106,210,0.42), 0 8px 30px rgba(94,106,210,0.20)',
        'glow-green': '0 0 0 1px rgba(101,217,148,0.30), 0 8px 24px rgba(101,217,148,0.14)',
        'glass': '0 0 0 1px rgba(255,255,255,0.06), 0 2px 20px rgba(0,0,0,0.40), 0 0 40px rgba(0,0,0,0.20)',
        'glass-hover': '0 0 0 1px rgba(255,255,255,0.10), 0 8px 40px rgba(0,0,0,0.50), 0 0 80px rgba(94,106,210,0.10)',
        'accent': '0 0 0 1px rgba(94,106,210,0.50), 0 4px 12px rgba(94,106,210,0.30), inset 0 1px 0 0 rgba(255,255,255,0.20)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0,0,0) rotate(0deg)' },
          '50%': { transform: 'translate3d(0,-20px,0) rotate(1deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.72', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
      },
      animation: {
        float: 'float 9s ease-in-out infinite',
        shimmer: 'shimmer 7s linear infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

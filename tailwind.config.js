/** @type {import('tailwindcss').Config} */
export default {
  // fr fr, this tells tailwind where our files are at so it doesn't ghost our classes
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // this color palette is lowkey giving cyber-y2k vibes
        void: {
          950: '#030014', // deepest void, major dark mode energy
          900: '#09090b',
          800: '#18181b',
          700: '#27272a',
        },
        neon: {
          pink: '#d946ef',  // fuchsia-500, main character energy
          cyan: '#06b6d4',  // cyan-500, smooth flows
          green: '#84cc16', // lime-500, goated for success
          purple: '#8b5cf6', // purple-500, aesthetic
        },
        hazard: {
          low: '#84cc16',    // green means go, W
          mid: '#eab308',    // yellow is kinda sus
          high: '#f97316',   // orange, big yikes
          crit: '#ef4444',   // red, massive L
        }
      },
      fontFamily: {
        // we ditching the boring fonts for that clean aesthetic
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        // glowing drop shadows because regular shadows are mid
        'glow-pink': '0 0 20px rgba(217, 70, 239, 0.4)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-green': '0 0 20px rgba(132, 204, 22, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{html,js}",
    "./src/*.html",
    "./src/ops-x7q/*.html"
  ],
  theme: {
    extend: {
      colors: {
        bg: '#03060F',
        panel: 'rgba(10, 18, 34, 0.85)',
        'panel-solid': '#0A1222',
        border: '#1B2A44',
        primary: {
          DEFAULT: '#4DA3E8',
          light: '#7CC4FF'
        },
        text: {
          DEFAULT: '#DFE2F1',
          muted: '#A8B3C7'
        },
        success: '#34D399',
        warn: '#F59E0B',
        danger: '#EF4444',
        paused: '#94A3B8',
        gold: '#F5C451',
        silver: '#C9D1DC',
        bronze: '#CD8A55'
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '2px',
        md: '4px',
        lg: '4px'
      },
      boxShadow: {
        outline: '0 0 0 1px #1B2A44, 4px 4px 0 0 rgba(124, 196, 255, 0.15)',
        glow: '0 0 20px -4px rgba(77, 163, 232, 0.35)',
        'glow-btn': '0 0 16px rgba(124, 196, 255, 0.4)'
      }
    }
  },
  plugins: []
}


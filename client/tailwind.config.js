/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0d1117',
          panel: '#161b22',
          border: '#21262d',
          accent: '#f97316',
          'accent-dim': '#9a3412',
          muted: '#6e7681',
          text: '#e6edf3',
          'text-dim': '#8b949e',
          green: '#3fb950',
          red: '#f85149',
          yellow: '#d29922',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

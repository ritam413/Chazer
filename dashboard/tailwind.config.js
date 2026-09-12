/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        chazer: {
          purple: '#7C3AED',
          'purple-light': '#A78BFA',
          'purple-dark': '#5B21B6',
        },
        surface: {
          base: '#0F0F13',
          card: '#18181F',
          elevated: '#22222C',
        },
        border: {
          subtle: '#2E2E3A',
        },
        tier1: { DEFAULT: '#22C55E', bg: '#14532D' },
        tier2: { DEFAULT: '#F59E0B', bg: '#78350F' },
        tier3: { DEFAULT: '#EF4444', bg: '#7F1D1D' },
        'high-value': '#F97316',
      },
      fontFamily: {
        sans: ['var(--font-libre-franklin)', 'Libre Franklin', 'system-ui', 'sans-serif'],
        serif: ['var(--font-libre-baskerville)', 'Libre Baskerville', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        sm: '8px',
        md: '16px',
      },
      boxShadow: {
        glass: '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        card: '0 2px 12px rgba(0, 0, 0, 0.3)',
        'purple-glow': '0 0 20px rgba(124, 58, 237, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sweep-spin': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

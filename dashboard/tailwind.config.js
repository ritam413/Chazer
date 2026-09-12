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
        // Monad Light Mode Tokens
        parchment: '#f6f3f1',
        'lake-blue': '#2b59d1',
        'lake-blue-dark': '#4d7aff',
        'periwinkle-mist': '#cfdaf5',
        'sky-blue': '#a0b5eb',
        mint: '#a7fccd',
        coral: '#ff9473',
        gold: '#ecda98',
        crimson: '#f37a0a',
        'off-black': '#242424',
        ink: '#000000',
        graphite: '#4e4d4d',
        smoke: '#797776',
        ash: '#cecac8',
        'ash-light': '#e5e2e0',

        // Monad Dark Mode Counterparts
        'dark-canvas': '#111215',
        'dark-surface': '#181a1f',
        'dark-elevated': '#21242d',
        'dark-border': '#2c2f3a',
        'dark-text-primary': '#f0ece9',
        'dark-text-secondary': '#a8a5a2',
        'dark-text-muted': '#72706e',
        'dark-periwinkle': '#1c2233',

        // Backward compatibility mappings
        chazer: {
          purple: '#2b59d1',
          'purple-light': '#4d7aff',
          'purple-dark': '#1e40af',
        },
        surface: {
          base: 'var(--bg-page)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-card-elevated)',
        },
        border: {
          subtle: 'var(--border-card)',
        },
        tier1: { DEFAULT: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
        tier2: { DEFAULT: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
        tier3: { DEFAULT: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
        'high-value': '#F97316',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'card': '32px',
        'card-lg': '40px',
        'pill': '9999px',
        'btn': '100px',
      },
      letterSpacing: {
        'serif-tight': '-0.02em',
        'mono-tight': '-0.025em',
        'mono-wide': '0.04em',
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

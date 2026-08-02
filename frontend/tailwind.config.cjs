/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './pages/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        success: {
          DEFAULT: 'hsl(var(--success))',
          soft: 'hsl(var(--success-soft))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          soft: 'hsl(var(--warning-soft))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          soft: 'hsl(var(--info-soft))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Named type scale. Screens previously invented arbitrary sizes
      // (text-[8px] … text-[13px]); these are the only steps the product uses.
      fontSize: {
        meta: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.005em' }],
        caption: ['0.75rem', { lineHeight: '1.125rem' }],
        body: ['0.8125rem', { lineHeight: '1.25rem' }],
        'body-lg': ['0.875rem', { lineHeight: '1.375rem' }],
        'title-sm': ['1rem', { lineHeight: '1.4rem', letterSpacing: '-0.011em' }],
        title: ['1.25rem', { lineHeight: '1.6rem', letterSpacing: '-0.018em' }],
        'title-lg': ['1.5rem', { lineHeight: '1.85rem', letterSpacing: '-0.024em' }],
        display: ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.032em' }],
      },
      boxShadow: {
        // Borders carry most hierarchy; elevation is reserved and consistent.
        raised: '0 1px 2px rgb(15 23 42 / 0.05)',
        lifted: '0 4px 16px -6px rgb(15 23 42 / 0.18)',
        floating: '0 12px 34px -14px rgb(15 23 42 / 0.30)',
      },
      transitionTimingFunction: {
        emphasis: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        control: '140ms',
        panel: '220ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'rise-in': 'rise-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

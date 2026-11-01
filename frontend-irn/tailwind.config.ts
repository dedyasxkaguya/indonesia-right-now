import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { 50: 'rgb(var(--paper-50-rgb) / <alpha-value>)', 100: 'rgb(var(--paper-100-rgb) / <alpha-value>)', 200: 'rgb(var(--paper-200-rgb) / <alpha-value>)', 300: 'rgb(var(--paper-300-rgb) / <alpha-value>)', 400: 'rgb(var(--paper-400-rgb) / <alpha-value>)' },
        ink: { 900: 'rgb(var(--ink-900-rgb) / <alpha-value>)', 700: 'rgb(var(--ink-700-rgb) / <alpha-value>)', 500: 'rgb(var(--ink-500-rgb) / <alpha-value>)', 400: 'rgb(var(--ink-400-rgb) / <alpha-value>)', 300: 'rgb(var(--ink-300-rgb) / <alpha-value>)', 100: 'rgb(var(--ink-100-rgb) / <alpha-value>)' },
        brand: { red: '#D32F2F', redDeep: '#A02020', ochre: '#B45309' },
        gov: {
          primary: 'rgb(var(--gov-primary-rgb) / <alpha-value>)',
          primaryDeep: 'rgb(var(--gov-primary-deep-rgb) / <alpha-value>)',
          primarySoft: 'rgb(var(--gov-primary-soft-rgb) / <alpha-value>)',
          cyan: 'rgb(var(--gov-cyan-rgb) / <alpha-value>)',
        },
        data: { purple: '#4A148C', purpleSoft: '#EDE7F6', success: '#15803D', danger: '#B91C1C', amber: '#FBBF24', pink: '#FDE8E8' },
      },
      fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
      fontSize: {
        display: ['68px', { lineHeight: '1.02', letterSpacing: '0', fontWeight: '700' }],
        h1: ['48px', { lineHeight: '1.08', letterSpacing: '0', fontWeight: '700' }],
        h2: ['32px', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '700' }],
        h3: ['20px', { lineHeight: '1.35', letterSpacing: '0', fontWeight: '600' }],
        body: ['15px', { lineHeight: '1.7', letterSpacing: '0' }],
        caption: ['13px', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        eyebrow: ['11px', { lineHeight: '1.4', letterSpacing: '0.14em', fontWeight: '600' }],
        'mono-num': ['44px', { lineHeight: '1', letterSpacing: '0', fontWeight: '600' }],
      },
      borderRadius: { btn: '6px', card: '8px', pill: '9999px' },
      keyframes: {
          // New CRT/Glitch keyframes
          scanlines: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '0 100%' } },
          noise: { '0%': { opacity: '0.2' }, '50%': { opacity: '0.5' }, '100%': { opacity: '0.2' } },
          'crt-flicker': { '0%': { opacity: '1' }, '20%': { opacity: '0.8' }, '40%': { opacity: '1' }, '60%': { opacity: '0.6' }, '80%': { opacity: '1' }, '100%': { opacity: '0.9' } },

        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'pulse-red': { '0%, 100%': { opacity: '0.45' }, '50%': { opacity: '1' } },
      },
              // animation utilities for new keyframes
        animation: {
          'fade-up': 'fade-up 500ms ease-out both',
          'pulse-red': 'pulse-red 1.8s ease-in-out infinite',
          'scanlines': 'scanlines 2s linear infinite',
          'noise': 'noise 1s ease-in-out infinite',
          'crt-flicker': 'crt-flicker 0.5s steps(5) infinite',
        },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;

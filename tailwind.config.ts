import type { Config } from 'tailwindcss'

// Farb- und Typo-Tokens lt. CD-Manual der Marktgemeinde Gumpoldskirchen (Stand November 2022).
// Präfix "gk" (Gumpoldskirchen). Corporate Colours: Dunkelblau, Weiß, Hellgrün; Weinrot als Akzent.
const config: Config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gk: {
          blau:       '#004B72', // Dunkelblau – Kopfleiste, Headlines, Primär-Aktion
          'blau-700': '#003A59', // Hover auf Dunkelblau
          'blau-80':  '#33627F', // Weingarten-Element dunkel (80 %)
          'blau-50':  '#E8EFF4', // Flächen mit blauer Tönung (aktive Chips, Fokus)
          'blau-100': '#D0DEE7',
          gruen:      '#A8C959', // Hellgrün – der grüne Balken, Akzent
          'gruen-text': '#98B652', // Hellgrün für Texte (lt. CD)
          'gruen-30': '#E5EECD', // Weingarten-Element hell (30 %)
          'gruen-bg': '#F3F7E6',
          wein:       '#9F456D', // Weinrot – Akzent zur Unterstreichung bestimmter Themen
          'wein-bg':  '#F7ECF1',
          bg:         '#F5F7F9',
          surface:    '#FFFFFF',
          line:       '#E6EAEE',
          'line-str': '#CBD3DA',
          text:       '#1E2B36',
          'text-1':   '#4A5A68',
          'text-2':   '#6B7A88',
          tertiary:   '#95A2AE',
          ok:   '#5E9E43', 'ok-bg':   '#EEF6EA', 'ok-fg':   '#3E6E2B',
          warn: '#D9A441', 'warn-bg': '#FBF3E3', 'warn-fg': '#8A6415',
          err:  '#9F456D', 'err-bg':  '#F7ECF1', 'err-fg':  '#7A2F52',
        },
        icp: { navy: '#14355C', signal: '#47A6CC' },
      },
      fontFamily: {
        sans:    ['var(--font-franklin)', 'Franklin Gothic', 'system-ui', 'sans-serif'],
        display: ['var(--font-condensed)', 'Franklin Gothic', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '0.625rem', '2xl': '0.875rem' },
    },
  },
  plugins: [],
}

export default config

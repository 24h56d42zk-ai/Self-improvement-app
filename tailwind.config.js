/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base:    '#04070d',
        panel:   '#080d16',
        panel2:  '#0c1420',
        line:    '#16283a',
        ink:     '#dbeafe',
        muted:   '#6b8299',
        accent:  '#22d3ee',
        // Categorische reeksen - gevalideerd op de donkere ondergrond (#080d16).
        s1: '#3987e5', // blauw   - school / zwemmen / cash
        s2: '#d95926', // oranje  - sport / lopen
        s3: '#199e70', // aqua    - business / hyrox / inventory
        s4: '#9085e9', // violet  - gezondheid
        s5: '#d55181', // magenta - persoonlijk / boeken
        // Statuskleuren - vast, nooit als reekskleur gebruiken.
        good:    '#0ca30c',
        warn:    '#fab219',
        serious: '#ec835a',
        bad:     '#d03b3b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        hud: '0 0 0 1px rgba(34,211,238,.14), 0 0 24px -8px rgba(34,211,238,.35)',
        glow: '0 0 18px -2px rgba(34,211,238,.55)',
      },
      keyframes: {
        sweep:  { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(300%)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
        flicker: { '0%,100%': { opacity: '1' }, '92%': { opacity: '1' }, '94%': { opacity: '.6' }, '96%': { opacity: '1' } },
        riseIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: {
        sweep: 'sweep 3.5s linear infinite',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
        flicker: 'flicker 6s linear infinite',
        riseIn: 'riseIn .45s cubic-bezier(.2,.7,.3,1) both',
      },
    },
  },
  plugins: [],
}

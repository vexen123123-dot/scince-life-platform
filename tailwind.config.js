/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'] },
      colors: {
        navy: { 950: '#050d24', 900: '#0a1a3f', 800: '#0f2557', 700: '#153273' },
        royal: { 500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af' },
        cyan: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2' },
        soft: { 50: '#f6f8fb', 100: '#eef2f7', 200: '#e1e7ef' },
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(10, 26, 63, 0.25)',
        glow: '0 0 0 4px rgba(34, 211, 238, 0.25)',
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
    },
  },
  plugins: [],
};

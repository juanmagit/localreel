/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0a0a0f',
          surface: '#12121a',
          card: 'rgba(22, 22, 34, 0.7)',
          glass: 'rgba(18, 18, 28, 0.75)',
          violet: '#7c3aed',
          glow: '#8b5cf6',
          pink: '#ec4899',
          cyan: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(124, 58, 237, 0.25)',
        card: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};

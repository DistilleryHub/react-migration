/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.jsx',
    './**/*.jsx',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // DistilleryHub navy dark theme
        navy: {
          bg: '#0b1325',        // page background
          card: '#131e36',      // card / surface
          cardAlt: '#1e293b',   // alternate surface (modals, dropdowns)
          border: '#1e2b45',    // subtle card border (~ slate-800 on navy)
        },
        brand: {
          DEFAULT: '#4f7fff',
          hover: '#3d6bef',
          soft: 'rgba(79, 127, 255, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      boxShadow: {
        card: '0 2px 10px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};

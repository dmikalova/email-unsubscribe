/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/public/**/*.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fce4ec',
          100: '#f8bbd9',
          200: '#f48fb1',
          300: '#f06292',
          400: '#ec407a',
          500: '#e91e63',
          600: '#d81b60',
          700: '#c2185b',
          800: '#ad1457',
          900: '#880e4f',
        },
      },
      boxShadow: {
        material: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        'material-lg': '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
        'material-xl': '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};

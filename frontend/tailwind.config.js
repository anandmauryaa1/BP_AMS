/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f5',
          100: '#fbe8ea',
          200: '#f7d5d8',
          300: '#f0b4ba',
          400: '#e58591',
          500: '#d95364',
          600: '#c5374a',
          700: '#a52839',
          800: '#892433',
          900: '#75222f',
          950: '#410d15',
        },
      },
    },
  },
  plugins: [],
};

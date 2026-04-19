/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tesla: { DEFAULT: '#E82127', hover: '#c41a1f' },
      },
    },
  },
  plugins: [],
}

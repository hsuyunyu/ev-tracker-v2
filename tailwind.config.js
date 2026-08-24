/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // WattWise 語意色票：對應 iOS Assets.xcassets/Theme 的 colorset。
      // 實際數值由 index.css 的 CSS 變數提供，淺/深色自動切換。
      colors: {
        ww: {
          bg:        'rgb(var(--ww-bg) / <alpha-value>)',
          card:      'rgb(var(--ww-card) / <alpha-value>)',
          seg:       'rgb(var(--ww-seg) / <alpha-value>)',
          seg2:      'rgb(var(--ww-seg2) / <alpha-value>)',
          field:     'rgb(var(--ww-field) / <alpha-value>)',
          barbg:     'rgb(var(--ww-barbg) / <alpha-value>)',

          line:      'rgb(var(--ww-line) / <alpha-value>)',
          line2:     'rgb(var(--ww-line2) / <alpha-value>)',
          line3:     'rgb(var(--ww-line3) / <alpha-value>)',

          ink:       'rgb(var(--ww-ink) / <alpha-value>)',
          ink2:      'rgb(var(--ww-ink2) / <alpha-value>)',
          sub:       'rgb(var(--ww-sub) / <alpha-value>)',
          faint:     'rgb(var(--ww-faint) / <alpha-value>)',

          greenbg:    'rgb(var(--ww-greenbg) / <alpha-value>)',
          greenline:  'rgb(var(--ww-greenline) / <alpha-value>)',
          greentitle: 'rgb(var(--ww-greentitle) / <alpha-value>)',

          // 品牌 / 分類色（固定，不隨主題變動）
          brand:      '#6E9266',
          brandhover: '#5F8A57',
          forest:     '#5F8A57',
          danger:     '#C0463F',
          toll:       '#C8A24C',
          maint:      '#8C6BA6',
          insurance:  '#4E7BB5',
        },
      },
      borderRadius: {
        // 對應 iOS WWRadius
        'ww-lg':    '26px',
        'ww-list':  '18px',
        'ww-sm':    '16px',
        'ww-inner': '14px',
        'ww-sheet': '30px',
      },
    },
  },
  plugins: [],
}

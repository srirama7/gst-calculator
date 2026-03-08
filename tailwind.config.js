/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0e27',
          800: '#0f1329',
          700: '#1a1f3a',
          600: '#2d1b69',
        },
        neon: {
          cyan: '#00ffcc',
          blue: '#00ccff',
          red: '#ff6b6b',
          orange: '#ff8e53',
          pink: '#ff0080',
        }
      }
    },
  },
  plugins: [],
}

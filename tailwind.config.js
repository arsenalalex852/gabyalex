/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dusk:  "#2b2440",
        dusk2: "#3b3358",
        lamp:  "#ffcaa0",
        cream: "#f6efe4",
        muted: "#b3a9cf",
        you:   "#7fd4c1",
        her:   "#f4a6c0",
      },
    },
  },
  plugins: [],
}

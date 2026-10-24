/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        plum: { DEFAULT: "#985f99", dark: "#7d4f80", deep: "#5e3a63", soft: "#f3ebf3" },
        // attention colour drawn from the magenta bird in the logo; replaces red/green/amber
        berry: { DEFAULT: "#b0416f", dark: "#8f3259", soft: "#f8e7ee" },
        gold: { DEFAULT: "#D4AF87", soft: "#f6efe4" },
        bronze: "#8c6640",      // gold for text (4.5:1 on white)
        cream: "#F8F6F2",
        ink: "#2d1f2d",
        bark: "#6B5E50",
        muted: "#74675a",       // secondary text (4.5:1 on cream and white)
        lilac: "#e9dcea",
        sand: "#e9e1d6",
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(45,31,45,0.04), 0 8px 24px -12px rgba(45,31,45,0.12)",
        float: "0 12px 40px -16px rgba(45,31,45,0.35)",
      },
      borderRadius: { xl2: "1.25rem" },
      keyframes: {
        rise: { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
      animation: { rise: "rise .25s ease-out both", shimmer: "shimmer 1.4s linear infinite" },
    },
  },
  plugins: [],
};

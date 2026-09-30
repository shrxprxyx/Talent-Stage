/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      colors: {
        background: "hsl(222, 20%, 8%)",
        foreground: "hsl(40, 15%, 92%)",

        card: "hsl(222, 18%, 11%)",
        "card-foreground": "hsl(40, 15%, 92%)",

        primary: "hsl(40, 85%, 58%)",
        "primary-foreground": "hsl(222, 20%, 8%)",

        secondary: "hsl(222, 14%, 16%)",
        "secondary-foreground": "hsl(40, 15%, 85%)",

        muted: "hsl(222, 14%, 16%)",
        "muted-foreground": "hsl(220, 10%, 55%)",

        accent: "hsl(40, 85%, 58%)",
        "accent-foreground": "hsl(222, 20%, 8%)",

        destructive: "hsl(0, 72%, 51%)",

        border: "hsl(222, 14%, 18%)",
        input: "hsl(222, 14%, 18%)",
        ring: "hsl(40, 85%, 58%)",
      },
    },
  },

  plugins: [],
};
/** @type {import('tailwindcss').Config} */
module.exports = {
content: [
  "./src/**/*.{js,jsx,ts,tsx}",
  "./components/**/*.{js,jsx,ts,tsx}",
  "./lib/**/*.{js,jsx,ts,tsx}",
],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(222, 20%, 8%)",
        foreground: "hsl(40, 15%, 92%)",
        card: "hsl(222, 18%, 11%)",
        "card-foreground": "hsl(40, 15%, 92%)",
        // amber sampled from the reference screenshots (#fe9b02)
        primary: "#fe9b02",
        "primary-foreground": "hsl(222, 20%, 8%)",
        secondary: "hsl(222, 14%, 16%)",
        "secondary-foreground": "hsl(40, 15%, 85%)",
        muted: "hsl(222, 14%, 16%)",
        "muted-foreground": "hsl(220, 10%, 55%)",
        accent: "#fe9b02",
        "accent-foreground": "hsl(222, 20%, 8%)",
        destructive: "hsl(0, 72%, 51%)",
        border: "hsl(222, 14%, 18%)",
        input: "hsl(222, 14%, 18%)",
        ring: "#fe9b02",
      },
      fontFamily: {
        display: ["PlayfairDisplay_700Bold"],
        "display-italic": ["PlayfairDisplay_700Bold_Italic"],
        sans: ["DMSans_400Regular"],
        "sans-medium": ["DMSans_500Medium"],
        "sans-bold": ["DMSans_700Bold"],
      },
    },
  },
  plugins: [],
};

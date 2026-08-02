/**
 * Preset Tailwind Kebrane — charte v1.0.
 * Marque : Georgia · Marine #1F3352 · Rouge #A5322C · accent par produit · « By Kebrane ».
 *
 * Usage (app) :
 *   // tailwind.config.ts
 *   import preset from "@kebrane/config/tailwind-preset";
 *   export default { presets: [preset], content: [...] };
 *
 * Les couleurs pointent vers des variables CSS définies dans "@kebrane/ui/styles.css".
 * `--accent` est surchargeable par produit (chaque produit = une couleur de conteneur).
 */
const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
        info: { DEFAULT: "hsl(var(--info))", foreground: "hsl(var(--info-foreground))" },
        // Secondaires charte
        ciel: { DEFAULT: "hsl(var(--ciel))", foreground: "hsl(var(--ciel-foreground))" },
        sable: { DEFAULT: "hsl(var(--sable))", foreground: "hsl(var(--sable-foreground))" },
        // Couleurs de marque brutes (référence charte v1.1)
        marine: "#1F3352",
        rouge: "#A5322C",
        cielRaw: "#A7C4DC",
        sableRaw: "#ECD8BE",
        encre: "#1A1A1A",
        papier: "#FBF9F5",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pill: "9999px",
      },
      fontFamily: {
        // Georgia = police de marque (titres, wordmark)
        serif: ["Georgia", "'Times New Roman'", "serif"],
        display: ["Georgia", "'Times New Roman'", "serif"],
        // sans-serif lisible pour l'UI dense
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "'Segoe UI'", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [animate],
};

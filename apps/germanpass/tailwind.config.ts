import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import kebranePreset from "@kebrane/config/tailwind-preset";

/**
 * GermanPass — thème dérivé du design system Kebrane (KB-12).
 *
 * Couleurs, rayons, typographies et `tailwindcss-animate` viennent désormais du
 * preset partagé : GermanPass ne redéfinit plus sa propre palette. Ne reste ici
 * que ce qui lui est PROPRE — le plugin typography (contenus longs de cours) et
 * les animations d'accordéon Radix.
 *
 * L'accent produit se règle dans `src/app/globals.css`, pas ici : c'est une
 * variable CSS, surchargeable sans toucher à la configuration Tailwind.
 */
const config: Config = {
  presets: [kebranePreset],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [typography],
};

export default config;

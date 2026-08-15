import type { Config } from "tailwindcss";
import preset from "@kebrane/config/tailwind-preset";

export default {
  presets: [preset],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config;

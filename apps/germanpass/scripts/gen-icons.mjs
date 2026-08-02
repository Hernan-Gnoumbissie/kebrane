/**
 * Génération des icônes PWA (192×192 et 512×512) pour GermanPass.
 *
 * Icône = le BOUCLIER du logo (drapeau allemand + coche), forme identique au
 * logo, sur FOND TRANSPARENT, sans texte « GP ». Rendu vectoriel → net partout.
 *
 * Usage : npm run gen-icons
 */

import sharp from "sharp";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "icons");

const ICONS = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
];

/** Bouclier (forme du logo) + drapeau allemand + coche, fond transparent. */
function makeShieldSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <clipPath id="shield">
      <path d="M120,104 Q188,118 256,92 Q324,118 392,104 V298 Q392,372 256,432 Q120,372 120,298 Z"/>
    </clipPath>
  </defs>
  <g clip-path="url(#shield)">
    <rect x="96" y="70" width="320" height="138" fill="#1A1A1A"/>
    <rect x="96" y="208" width="320" height="112" fill="#DD0000"/>
    <rect x="96" y="320" width="320" height="120" fill="#FFCE00"/>
  </g>
  <path d="M210,260 l34,36 l72,-92" fill="none" stroke="#FFFFFF" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const { size, name } of ICONS) {
    const dest = join(OUT_DIR, name);
    await sharp(Buffer.from(makeShieldSvg(size)))
      .png() // fond transparent conservé (pas de flatten)
      .toFile(dest);
    console.log(`✅ ${name} (${size}×${size}) — bouclier transparent`);
  }

  console.log("\n🎉 Icônes dans public/icons/");
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});

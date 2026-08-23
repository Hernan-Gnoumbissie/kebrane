// @kebrane/core — registre déclaratif des produits de la maison Kebrane (KB-09).
//
// Source unique de la « carte de visite » d'un produit : slug (= `product_id`
// métier), nom, accroche, couleur d'accent (charte : « une couleur de conteneur
// par produit ») et URL. Consommé par le seed (`scripts/seed.ts`) et par le hub.
//
// Ce fichier est du DÉCLARATIF : il n'accède à aucune table. L'écriture passe
// par `products.upsert()` de l'interface de services.
import { ProductStatus } from "@kebrane/db";

export interface ProductDefinition {
  slug: string;
  name: string;
  tagline: string;
  /** Couleur de conteneur du produit (HEX, cadre charte Marine/Rouge). */
  accentColor: string;
  /** URL publique du produit ; surchargeable par env selon l'environnement.
   *  Absente tant que le produit n'existe pas (`COMING_SOON`). */
  url?: string;
  status: ProductStatus;
}

/**
 * URL d'un produit : variable d'environnement dédiée si présente, sinon défaut.
 * Permet de pointer localhost en dev et le sous-domaine en prod (KB-10) sans
 * retoucher la base.
 */
function productUrl(envVar: string, fallback: string): string {
  return process.env[envVar] ?? fallback;
}

export const PRODUCT_REGISTRY: ProductDefinition[] = [
  {
    slug: "germanpass",
    name: "GermanPass",
    tagline: "Préparation aux examens d'allemand (A1–C2) — Goethe, ÖSD, telc, ECL, TestDaF.",
    // ⚠ PROVISOIRE — décision PO en attente (KB-02) sur l'accent officiel de
    // GermanPass. On reprend le Rouge de la charte (`--accent` par défaut) en
    // attendant ; changer ici puis rejouer le seed suffira.
    accentColor: "#A5322C",
    url: productUrl("GERMANPASS_URL", "http://localhost:3000"),
    status: ProductStatus.ACTIVE,
  },

  // Produits annoncés (KB-19). Ils vivaient jusqu'ici EN DUR dans la landing du
  // hub, en double du registre : deux catalogues = dérive assurée. Ils entrent
  // donc ici, en `COMING_SOON` et sans URL — la landing et le hub les lisent
  // désormais au même endroit.
  //
  // NOMMAGE (décision PO, 22 août 2026) : convention « -Pass » des documents
  // fondateurs (brand/docs/L-Identite-verbale-Kebrane.md) + qualificatif local
  // porté par la tagline. GermanPass n'est donc plus l'exception.
  //
  // ⚠ Accents PROVISOIRES (repris de la landing) — même réserve que GermanPass :
  // la charte produit par produit reste une décision PO.
  {
    slug: "tcfpass",
    name: "TCFPass",
    tagline: "Le TCF pour le Canada — entraînement et simulations.",
    accentColor: "#2E6F5E",
    status: ProductStatus.COMING_SOON,
  },
  {
    slug: "permitpass",
    name: "PermitPass",
    tagline: "Le code de la route au Cameroun — préparation à l'examen du permis.",
    accentColor: "#B8860B",
    status: ProductStatus.COMING_SOON,
  },
  // « Gestion Formation » RETIRÉ du catalogue public (décision PO, 22 août 2026) :
  // outil de gestion (B2B), il ne fait tomber aucune barrière personnelle et sort
  // du périmètre du Manifeste. À réintroduire seulement s'il est repositionné comme
  // produit servant une personne — avec un slug/nom conformes à la convention.
];

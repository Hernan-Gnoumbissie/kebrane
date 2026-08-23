import type { MetadataRoute } from "next";
import { KEBRANE_HUB_URL } from "@/lib/platform";

/**
 * Plan du site (KB-16, étendu par KB-33).
 *
 * Volontairement limité aux pages PUBLIQUES. `/hub`, `/login` et `/register`
 * n'y figurent pas : indexer une zone connectée n'apporte rien et expose la
 * structure de l'application. Le webhook Clerk encore moins.
 *
 * Les priorités disent à quoi sert chaque page, pas ce qu'on en pense : la
 * vitrine convertit, les pages produit et tarifs aussi ; les documents légaux
 * doivent être TROUVABLES mais ne cherchent personne.
 */
const PAGES: { chemin: string; priorite: number; frequence: "monthly" | "yearly" }[] = [
  { chemin: "/", priorite: 1, frequence: "monthly" },
  { chemin: "/produits/germanpass", priorite: 0.9, frequence: "monthly" },
  { chemin: "/tarifs", priorite: 0.8, frequence: "monthly" },
  { chemin: "/faq", priorite: 0.6, frequence: "monthly" },
  { chemin: "/a-propos", priorite: 0.5, frequence: "yearly" },
  { chemin: "/contact", priorite: 0.5, frequence: "yearly" },
  { chemin: "/mentions-legales", priorite: 0.3, frequence: "yearly" },
  { chemin: "/cgu", priorite: 0.3, frequence: "yearly" },
  { chemin: "/cgv", priorite: 0.3, frequence: "yearly" },
  { chemin: "/confidentialite", priorite: 0.3, frequence: "yearly" },
  { chemin: "/cookies", priorite: 0.3, frequence: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map((page) => ({
    // `KEBRANE_HUB_URL` n'a pas de barre finale ; « / » deviendrait « //… ».
    url: page.chemin === "/" ? KEBRANE_HUB_URL : `${KEBRANE_HUB_URL}${page.chemin}`,
    lastModified,
    changeFrequency: page.frequence,
    priority: page.priorite,
  }));
}

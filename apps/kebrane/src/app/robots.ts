import type { MetadataRoute } from "next";
import { KEBRANE_HUB_URL } from "@/lib/platform";

/**
 * Règles d'indexation (KB-16).
 *
 * La vitrine est ouverte ; tout le reste est fermé. `/hub` et les écrans
 * d'authentification n'ont rien à faire dans un index de moteur de recherche —
 * ce sont des pages qui exigent une session, et les référencer ne produirait
 * que des résultats frustrants.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/hub", "/login", "/register", "/api/"],
    },
    sitemap: `${KEBRANE_HUB_URL}/sitemap.xml`,
  };
}

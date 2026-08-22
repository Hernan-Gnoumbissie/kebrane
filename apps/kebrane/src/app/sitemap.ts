import type { MetadataRoute } from "next";
import { KEBRANE_HUB_URL } from "@/lib/platform";

/**
 * Plan du site (KB-16).
 *
 * Volontairement limité aux pages PUBLIQUES. `/hub`, `/login` et `/register`
 * n'y figurent pas : indexer une zone connectée n'apporte rien et expose la
 * structure de l'application. Le webhook Clerk encore moins.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: KEBRANE_HUB_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}

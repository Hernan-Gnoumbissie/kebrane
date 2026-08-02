"use client";

import { useRouter, usePathname } from "next/navigation";

/**
 * Bande « Retour » affichée SOUS la barre de navigation (entre la nav et le
 * titre de la page), sur TOUS les écrans. Masquée sur /dashboard et / (accueil).
 */
export function MobileBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Pas de bouton retour sur le tableau de bord et la page d'accueil
  if (!pathname || pathname === "/dashboard" || pathname === "/") return null;

  return (
    <div className="container py-2">
        <button
          type="button"
          aria-label="Retour à la page précédente"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-accent transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Retour
        </button>
    </div>
  );
}

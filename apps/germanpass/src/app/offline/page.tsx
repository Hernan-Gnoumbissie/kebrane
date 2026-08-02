import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hors ligne",
  description: "Vous êtes actuellement hors ligne.",
};

/**
 * Page de repli pour les routes inaccessibles sans connexion
 * (Schreiben, Sprechen, Hören — toutes dépendantes de l'IA ou du streaming).
 *
 * Cette page est précachée par Serwist et servie comme fallback de navigation
 * quand l'utilisateur tente d'accéder à une page non disponible hors-ligne.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      {/* Icône WiFi barré */}
      <div className="rounded-full bg-amber-100 p-6">
        <svg
          className="h-12 w-12 text-amber-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
          {/* Barre rouge */}
          <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" className="text-red-500" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Vous êtes hors ligne</h1>

      <p className="max-w-sm text-muted-foreground">
        Cette page nécessite une connexion internet. Elle sera accessible dès que votre
        connexion sera rétablie.
      </p>

      {/* Récapitulatif des fonctionnalités */}
      <div className="w-full max-w-xs rounded-lg border bg-card p-4 text-left shadow-sm">
        <p className="mb-3 text-sm font-semibold text-card-foreground">Disponible hors ligne :</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2 text-green-700">
            <span aria-hidden="true">✅</span> Flashcards (révision vocabulaire SRS)
          </li>
          <li className="flex items-center gap-2 text-green-700">
            <span aria-hidden="true">✅</span> Leçons déjà consultées
          </li>
        </ul>
        <p className="mb-3 mt-4 text-sm font-semibold text-card-foreground">Nécessite internet :</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2 text-muted-foreground">
            <span aria-hidden="true">❌</span> Schreiben (correction IA)
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <span aria-hidden="true">❌</span> Sprechen (correction IA + audio)
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <span aria-hidden="true">❌</span> Hören (streaming audio)
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <span aria-hidden="true">❌</span> Examens chronométrés
          </li>
        </ul>
      </div>

      <Link
        href="/learn"
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Réviser les flashcards →
      </Link>
    </main>
  );
}

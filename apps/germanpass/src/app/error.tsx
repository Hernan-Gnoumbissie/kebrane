"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary Next.js App Router — intercepte les erreurs runtime (y compris
 * les NotFoundError DOM / hydratation) et affiche un message user-friendly
 * plutôt que la page blanche d'erreur Next.js.
 */
export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log silencieux — à remplacer par Sentry/Axiom si besoin.
    console.error("[GermanPass] Erreur capturée par l'error boundary :", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <p className="text-5xl">⚠️</p>
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="text-muted-foreground max-w-sm">
          La page a rencontré un problème inattendu. Cela peut arriver lors d&apos;un
          rechargement ou d&apos;une mise à jour de l&apos;application.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground font-mono">Réf. : {error.digest}</p>
        ) : null}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-secondary hover:text-secondary-foreground transition-colors"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}

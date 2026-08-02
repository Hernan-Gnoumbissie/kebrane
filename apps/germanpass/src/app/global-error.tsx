"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary — couvre les erreurs dans le RootLayout lui-même.
 * Doit inclure <html> et <body> car il remplace l'entièreté du document.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[GermanPass] Erreur globale :", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center font-sans">
        <p className="text-5xl">⚠️</p>
        <h1 className="text-2xl font-bold">Erreur critique</h1>
        <p className="text-gray-500 max-w-sm">
          L&apos;application a rencontré un problème grave. Veuillez rafraîchir la page
          ou revenir plus tard.
        </p>
        {error.digest ? (
          <p className="text-xs text-gray-400 font-mono">Réf. : {error.digest}</p>
        ) : null}
        <button
          onClick={reset}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}

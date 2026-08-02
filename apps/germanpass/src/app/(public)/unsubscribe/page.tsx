import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Se désabonner des emails",
  robots: { index: false },
};

/**
 * Page de désabonnement des emails marketing.
 * La désinscription effective est gérée dans le compte (paramètres de notification).
 * Cette page satisfait l'obligation légale d'avoir un lien de désinscription fonctionnel
 * dans les emails (RGPD art. 7 / CAN-SPAM).
 */
export default function UnsubscribePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="max-w-sm space-y-4">
        <p className="text-4xl">📧</p>
        <h1 className="text-2xl font-bold text-gray-900">Se désabonner</h1>
        <p className="text-gray-600">
          Pour ne plus recevoir les emails de GermanPass, connectez-vous à votre compte
          et gérez vos préférences de notification dans les paramètres.
        </p>
        <p className="text-sm text-gray-500">
          Les emails transactionnels (activation de compte, réinitialisation de mot de passe,
          expiration d&apos;accès) ne peuvent pas être désactivés car ils sont indispensables au
          bon fonctionnement de votre compte.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/account"
            className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Gérer mes préférences →
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}

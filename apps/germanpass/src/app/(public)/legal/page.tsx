export const metadata = { title: "Mentions légales & RGPD" };

export default function LegalPage() {
  return (
    <main className="container max-w-3xl space-y-6 py-12">
      <h1 className="text-3xl font-bold">Mentions légales &amp; protection des données</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Indépendance / Unabhängigkeit</h2>
        <p className="font-medium">
          Plattform nicht mit Goethe-Institut, ÖSD, telc gGmbH oder ECL verbunden.
        </p>
        <p className="text-muted-foreground">
          Cette plateforme est indépendante et n&apos;est affiliée à aucun organisme certificateur
          (Goethe-Institut, ÖSD, telc gGmbH, ECL). Aucun sujet, question, audio ou texte officiel
          n&apos;est reproduit. Tout le contenu d&apos;entraînement est original ; seules les
          structures pédagogiques publiques des épreuves (nombre de parties, types de tâches,
          durées, barèmes) sont respectées. Les marques citées appartiennent à leurs propriétaires
          respectifs.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">RGPD</h2>
        <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
          <li>Minimisation des données : seules les données nécessaires au service sont collectées.</li>
          <li>Hébergement dans l&apos;Union européenne.</li>
          <li>
            Enregistrements audio (épreuve Sprechen) : uniquement avec votre consentement explicite,
            révocable à tout moment depuis votre compte.
          </li>
          <li>Export de vos données et suppression de compte disponibles depuis votre espace.</li>
          <li>
            L&apos;évaluation de l&apos;expression orale par IA est indicative ; l&apos;évaluation
            de la prononciation est approximative.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Contact</h2>
        {/* Le RGPD exige un contact IDENTIFIABLE : « l'administrateur de la
            plateforme » ne suffisait pas. Deux adresses parce que ce sont deux
            responsabilités — le produit répond du service, la maison Kebrane
            répond des données. */}
        <ul className="space-y-1 text-muted-foreground">
          <li>
            Questions sur le service, l&apos;abonnement ou un paiement :{" "}
            <a className="underline" href="mailto:support@germanpass.io">
              support@germanpass.io
            </a>
          </li>
          <li>
            Données personnelles (accès, rectification, suppression, portabilité) :{" "}
            <a className="underline" href="mailto:rgpd@kebrane.com">
              rgpd@kebrane.com
            </a>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          GermanPass est un produit de la maison Kebrane, responsable du traitement de vos
          données.
        </p>
      </section>
    </main>
  );
}

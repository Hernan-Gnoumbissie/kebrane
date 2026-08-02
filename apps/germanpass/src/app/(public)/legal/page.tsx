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
        <p className="text-muted-foreground">
          Pour toute question relative aux données personnelles : contactez l&apos;administrateur de
          la plateforme.
        </p>
      </section>
    </main>
  );
}

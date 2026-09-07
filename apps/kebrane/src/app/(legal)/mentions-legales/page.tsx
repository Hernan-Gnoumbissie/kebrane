import type { Metadata } from "next";
import Link from "next/link";
import { ACompleter, LegalDocument, LegalSection } from "@/components/legal-document";

// Contenu : `docs/content/mentions-legales.md` (KB-32), repris mot pour mot.
export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Éditeur, directeur de la publication, hébergeur et indépendance de la maison Kebrane.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <LegalDocument
      titre="Mentions légales"
      miseAJour="Dernière mise à jour : 23 août 2026"
      incomplet
    >
      <LegalSection titre="Éditeur du site">
        <p>
          Le site <strong>kebrane.com</strong> est édité par :
        </p>
        <ul>
          <li>
            <strong>Nom</strong> : Crespo Hernan Gnoumbissie Djambe
          </li>
          <li>
            <strong>Statut juridique</strong> : Entrepreneur individuel — personne physique
            exerçant une activité indépendante (non immatriculée)
          </li>
          <li>
            <strong>Adresse</strong> : <ACompleter>adresse postale</ACompleter> — Douala, Cameroun
          </li>
          <li>
            <strong>Immatriculation</strong> : Activité indépendante non immatriculée à ce jour{" "}
            <ACompleter>
              indiquer un n° de contribuable / RCCM si tu en obtiens un
            </ACompleter>
          </li>
          <li>
            <strong>Contact</strong> :{" "}
            <a href="mailto:bonjour@kebrane.com">bonjour@kebrane.com</a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection titre="Directeur de la publication">
        <p>Crespo Hernan Gnoumbissie Djambe (fondateur)</p>
      </LegalSection>

      <LegalSection titre="Hébergement">
        <p>Le site est hébergé par :</p>
        <ul>
          <li>
            <strong>Hébergeur</strong> : IONOS SE
          </li>
          <li>
            <strong>Adresse</strong> : Elgendorfer Straße 57, 56410 Montabaur, Allemagne
          </li>
          <li>
            <strong>Contact France</strong> : IONOS SARL, 7 place de la Gare, BP 70109, 57200
            Sarreguemines Cedex — tél. depuis la France : disponible sur ionos.fr
          </li>
        </ul>
      </LegalSection>

      <LegalSection titre="Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments du site (marque « Kebrane », logo, textes, mise en page,
          contenus pédagogiques originaux) est protégé. Toute reproduction sans autorisation est
          interdite.
        </p>
      </LegalSection>

      <LegalSection titre="Indépendance vis-à-vis des organismes certificateurs">
        <p>
          Les produits de la maison Kebrane sont <strong>indépendants</strong> et ne sont affiliés
          à aucun organisme certificateur (Goethe-Institut, ÖSD, telc gGmbH, ECL, ni aucun
          organisme officiel d&apos;examen). Aucun sujet, question, audio ou texte officiel
          n&apos;est reproduit. Tout le contenu d&apos;entraînement est original ; seules les
          structures pédagogiques publiques des épreuves (nombre de parties, types de tâches,
          durées, barèmes) sont respectées. Les marques citées appartiennent à leurs propriétaires
          respectifs.
        </p>
      </LegalSection>

      <LegalSection titre="Contact">
        <p>
          Pour toute question : voir la page <Link href="/contact">Contact</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

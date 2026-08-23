import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal-document";

// Contenu : `docs/content/cgu.md` (KB-32), repris mot pour mot.
export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description:
    "Règles d'usage du compte Kebrane : disponibilité, responsabilités, propriété intellectuelle, résiliation.",
  alternates: { canonical: "/cgu" },
};

export default function CguPage() {
  return (
    <LegalDocument
      titre="Conditions Générales d'Utilisation (CGU)"
      miseAJour="Date d'effet : 23 août 2026"
    >
      <LegalSection titre="1. Objet">
        <p>
          Les présentes CGU régissent l&apos;utilisation du site <strong>kebrane.com</strong> et du{" "}
          <strong>compte Kebrane</strong> — une identité unique donnant accès aux différents
          produits de la maison Kebrane (ci-après « les Produits », par exemple GermanPass).
          L&apos;accès à chaque Produit peut être soumis à un abonnement distinct (voir les{" "}
          <Link href="/cgv">CGV</Link>).
        </p>
      </LegalSection>

      <LegalSection titre="2. Le compte Kebrane">
        <p>
          Un compte Kebrane est <strong>nominatif</strong> et personnel. L&apos;utilisateur
          s&apos;engage à fournir des informations exactes et à préserver la confidentialité de
          ses identifiants. Un compte permet d&apos;accéder à plusieurs Produits, chacun selon son
          propre abonnement.
        </p>
        <p>
          L&apos;authentification est assurée par un prestataire tiers (Clerk) ; voir la{" "}
          <Link href="/confidentialite">Politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection titre="3. Accès au service et disponibilité">
        <p>
          Kebrane s&apos;efforce d&apos;assurer la disponibilité du service, sans garantie
          d&apos;ininterruption. Des opérations de maintenance ou des causes indépendantes de la
          volonté de Kebrane peuvent entraîner des interruptions.
        </p>
      </LegalSection>

      <LegalSection titre="4. Usage acceptable">
        <p>
          L&apos;utilisateur s&apos;engage à ne pas : détourner le service, tenter d&apos;y accéder
          de façon non autorisée, partager son compte, reproduire ou revendre les contenus, ou
          porter atteinte au fonctionnement du service.
        </p>
      </LegalSection>

      <LegalSection titre="5. Contenus pédagogiques et évaluations par IA">
        <p>
          Les contenus sont fournis à titre d&apos;entraînement. Les évaluations générées par
          intelligence artificielle (par ex. l&apos;expression orale ou écrite) sont{" "}
          <strong>indicatives</strong> et ne préjugent pas du résultat à un examen officiel.
        </p>
      </LegalSection>

      <LegalSection titre="6. Propriété intellectuelle">
        <p>
          Les contenus et la marque restent la propriété de Kebrane (voir{" "}
          <Link href="/mentions-legales">Mentions légales</Link>). L&apos;abonnement confère un
          droit d&apos;usage personnel, non exclusif et non cessible.
        </p>
      </LegalSection>

      <LegalSection titre="7. Données personnelles">
        <p>
          Le traitement des données est décrit dans la{" "}
          <Link href="/confidentialite">Politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection titre="8. Résiliation">
        <p>
          L&apos;utilisateur peut supprimer son compte à tout moment depuis son espace. Kebrane
          peut suspendre ou fermer un compte en cas de manquement aux présentes CGU.
        </p>
      </LegalSection>

      <LegalSection titre="9. Modification des CGU">
        <p>
          Kebrane peut modifier les CGU ; la version applicable est celle en vigueur à la date
          d&apos;utilisation. Les modifications substantielles sont notifiées.
        </p>
      </LegalSection>

      <LegalSection titre="10. Droit applicable">
        <p>
          Les présentes CGU sont régies par le <strong>droit camerounais</strong>. À défaut de
          résolution amiable, tout litige relève des{" "}
          <strong>juridictions compétentes de Douala, Cameroun</strong>.
        </p>
      </LegalSection>

      <LegalSection titre="11. Contact">
        <p>
          <Link href="/contact">Contact</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

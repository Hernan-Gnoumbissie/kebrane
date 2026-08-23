import type { Metadata } from "next";
import Link from "next/link";
import { ACompleter, LegalDocument, LegalSection } from "@/components/legal-document";

// Contenu : `docs/content/confidentialite.md` (KB-32), repris mot pour mot.
export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Données collectées, finalités, durées, sous-traitants et droits — Kebrane, responsable du traitement.",
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  return (
    <LegalDocument
      titre="Politique de confidentialité"
      miseAJour="Dernière mise à jour : 23 août 2026"
      incomplet
    >
      <LegalSection titre="1. Responsable du traitement">
        <p>
          {/* Marqueur résolu : l'identité de l'éditeur est arrêtée (décision PO,
              22 août 2026). Nommer le responsable du traitement est une mention
              obligatoire — la laisser en attente n'était tenable que tant que
              l'information manquait vraiment. L'adresse postale, elle, reste en
              attente et n'est pas requise ici : les Mentions légales la portent. */}
          Le responsable du traitement des données est <strong>Kebrane</strong>, édité par{" "}
          <strong>Crespo Hernan Gnoumbissie Djambe</strong>, entrepreneur individuel établi à
          Douala (Cameroun) — voir <Link href="/mentions-legales">Mentions légales</Link>.
          Contact dédié aux données personnelles :{" "}
          <strong>
            <a href="mailto:rgpd@kebrane.com">rgpd@kebrane.com</a>
          </strong>
          .
        </p>
        <p>
          Kebrane répond des <strong>données</strong> ; chaque Produit répond de son{" "}
          <strong>service</strong>. Un compte Kebrane unique peut donner accès à plusieurs
          Produits.
        </p>
      </LegalSection>

      <LegalSection titre="2. Données collectées">
        <ul>
          <li>
            <strong>Compte</strong> : nom, adresse e-mail, identifiants d&apos;authentification
            (gérés par Clerk).
          </li>
          <li>
            <strong>Usage des Produits</strong> : progression, résultats d&apos;entraînement,
            préférences.
          </li>
          <li>
            <strong>Contenus soumis</strong> : par ex. enregistrements audio (épreuve
            d&apos;expression orale) ou textes — uniquement avec votre consentement, révocable.
          </li>
          <li>
            <strong>Paiement</strong> : données nécessaires à la transaction, traitées par le
            prestataire de paiement ; Kebrane ne stocke pas vos coordonnées bancaires complètes.
          </li>
          <li>
            <strong>Techniques</strong> : cookies essentiels de session (voir{" "}
            <Link href="/cookies">Politique cookies</Link>).
          </li>
        </ul>
      </LegalSection>

      <LegalSection titre="3. Finalités et base légale">
        <ul>
          <li>Fournir et sécuriser le service (exécution du contrat).</li>
          <li>Gérer les abonnements et paiements (exécution du contrat / obligation légale).</li>
          <li>Améliorer les Produits (intérêt légitime).</li>
          <li>
            Communications essentielles (exécution du contrat) ; communications non essentielles
            (consentement).
          </li>
        </ul>
      </LegalSection>

      <LegalSection titre="4. Durées de conservation">
        <p>
          Les données sont conservées le temps nécessaire au service, puis supprimées ou
          anonymisées.{" "}
          <ACompleter>préciser les durées par catégorie si possible.</ACompleter>
        </p>
      </LegalSection>

      <LegalSection titre="5. Sous-traitants et prestataires">
        <ul>
          <li>
            <strong>Clerk</strong> — authentification et gestion des identités.
          </li>
          <li>
            <strong>IONOS SE</strong> (Montabaur, Allemagne — UE) — hébergement.
          </li>
          <li>
            <strong>
              <ACompleter>prestataire de paiement, ex. KPay</ACompleter>
            </strong>{" "}
            — encaissement mobile money (MTN Mobile Money, Orange Money).
          </li>
        </ul>
        <p>Ces prestataires n&apos;agissent que sur instruction de Kebrane.</p>
      </LegalSection>

      <LegalSection titre="6. Transferts hors du pays">
        {/* Ce que la pile technique impose réellement, et rien de plus. Les
            localisations ci-dessous sont vérifiables : IONOS est l'hébergeur
            déclaré aux Mentions légales, Clerk est une société américaine. */}
        <p>
          Kebrane opère depuis le Cameroun, mais ses prestataires ne s&apos;y trouvent pas :
          vos données sont donc traitées hors de votre pays de résidence.
        </p>
        <ul>
          <li>
            <strong>Hébergement</strong> : <strong>Allemagne (Union européenne)</strong> —
            serveurs IONOS SE, à Montabaur. La base de données et les fichiers y résident.
          </li>
          <li>
            <strong>Authentification</strong> : <strong>Clerk</strong>, société établie aux{" "}
            <strong>États-Unis</strong>. Les données de compte (nom, e-mail, identifiants) sont
            traitées par elle, ce qui peut impliquer un transfert hors de l&apos;Union
            européenne, encadré par ses engagements contractuels.
          </li>
          <li>
            <strong>Encaissement</strong> :{" "}
            <ACompleter>
              localisation du prestataire de paiement, à préciser une fois celui-ci retenu
            </ACompleter>
            .
          </li>
        </ul>
      </LegalSection>

      <LegalSection titre="7. Vos droits">
        <p>
          Vous disposez des droits d&apos;<strong>accès, rectification, suppression,
          portabilité</strong> et d&apos;opposition. Vous pouvez :
        </p>
        <ul>
          <li>
            <strong>exporter vos données</strong> et <strong>supprimer votre compte</strong> depuis{" "}
            <Link href="/hub/parametres">votre espace</Link> ;
          </li>
          <li>
            écrire à{" "}
            <strong>
              <a href="mailto:rgpd@kebrane.com">rgpd@kebrane.com</a>
            </strong>{" "}
            pour toute demande.
          </li>
        </ul>
        <p>
          Le consentement aux enregistrements audio est <strong>révocable à tout moment</strong>{" "}
          depuis le compte.
        </p>
      </LegalSection>

      <LegalSection titre="8. Sécurité">
        <p>
          Kebrane met en œuvre des mesures techniques et organisationnelles raisonnables pour
          protéger les données.
        </p>
      </LegalSection>

      <LegalSection titre="9. Mineurs">
        <p>
          <ACompleter>
            âge minimum d&apos;inscription et modalités pour les mineurs, selon le public visé.
          </ACompleter>
        </p>
      </LegalSection>

      <LegalSection titre="10. Modifications">
        <p>
          Cette politique peut évoluer ; la version applicable est celle publiée sur cette page.
        </p>
      </LegalSection>

      <LegalSection titre="11. Contact">
        <p>
          Données personnelles :{" "}
          <strong>
            <a href="mailto:rgpd@kebrane.com">rgpd@kebrane.com</a>
          </strong>{" "}
          — voir aussi <Link href="/contact">Contact</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

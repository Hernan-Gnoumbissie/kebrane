import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal-document";

// Contenu : `docs/content/cookies.md` (KB-32), repris mot pour mot.
//
// ⚠ AUCUN bandeau de consentement n'est monté par l'application (KB-26). Tant
// que le site ne dépose que les cookies de session Clerk — essentiels, donc
// exemptés —, demander un consentement serait à la fois inutile et trompeur :
// il n'y aurait rien à refuser. Le bandeau ne s'ajoutera qu'avec le premier
// traceur non essentiel, et devra alors rendre le refus aussi simple que
// l'acceptation.
export const metadata: Metadata = {
  title: "Politique cookies",
  description:
    "Les cookies déposés par Kebrane : session Clerk (essentiels) et, à ce jour, aucun traceur non essentiel.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalDocument titre="Politique cookies" miseAJour="Dernière mise à jour : 23 août 2026">
      <LegalSection titre="Qu'est-ce qu'un cookie ?">
        <p>
          Un cookie est un petit fichier déposé sur votre appareil lors de la visite d&apos;un
          site. Certains sont <strong>indispensables</strong> au fonctionnement du service,
          d&apos;autres sont <strong>facultatifs</strong>.
        </p>
      </LegalSection>

      <LegalSection titre="Cookies utilisés par Kebrane">
        <h3 className="font-serif text-base font-semibold text-foreground">
          Cookies essentiels (pas de consentement requis)
        </h3>
        <ul>
          <li>
            <strong>Session / authentification</strong> (Clerk) : maintiennent votre connexion et
            sécurisent votre compte. Sans eux, le service ne peut pas fonctionner.
          </li>
        </ul>

        <h3 className="pt-2 font-serif text-base font-semibold text-foreground">
          Cookies facultatifs
        </h3>
        {/* Ce point n'était pas une question au PO mais un CONSTAT, vérifiable
            dans le code : aucune dépendance de mesure, aucun script tiers, aucun
            appel analytique. Le marqueur a donc été levé. */}
        <p>
          À ce jour, Kebrane n&apos;utilise <strong>aucun</strong> traceur non essentiel — ni
          mesure d&apos;audience, ni publicité, ni réseau social. Si un outil de mesure est
          ajouté un jour, il sera listé ici et <strong>soumis à votre consentement</strong> via
          un bandeau.
        </p>
      </LegalSection>

      <LegalSection titre="Bandeau de consentement">
        <p>
          Tant que Kebrane n&apos;utilise que des cookies essentiels,{" "}
          <strong>aucun bandeau de consentement n&apos;est nécessaire</strong>. Dès l&apos;ajout
          d&apos;un traceur non essentiel, un bandeau permettra de l&apos;accepter ou de le
          refuser — le refus étant aussi simple que l&apos;acceptation.
        </p>
      </LegalSection>

      <LegalSection titre="Gérer les cookies">
        <p>
          Vous pouvez configurer votre navigateur pour bloquer ou supprimer les cookies. Le
          blocage des cookies essentiels peut empêcher la connexion à votre compte.
        </p>
      </LegalSection>

      <LegalSection titre="Contact">
        <p>
          <Link href="/contact">Contact</Link> · Données :{" "}
          <a href="mailto:rgpd@kebrane.com">rgpd@kebrane.com</a>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

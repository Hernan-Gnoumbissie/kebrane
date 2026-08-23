import type { Metadata } from "next";
import { EditorialPage, EditorialSection } from "@/components/editorial";
import { ACompleter } from "@/components/legal-document";

// Contenu : `docs/content/contact.md` (KB-32), repris mot pour mot.
//
// Pas de formulaire au lancement (décision KB-30) : un formulaire demande une
// boîte de réception surveillée, une protection anti-spam et une trace de
// consentement. Trois adresses `mailto:` rendent le même service tout de suite.
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Écrivez à l'adresse qui correspond à votre demande : service, données personnelles, ou la maison Kebrane.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <EditorialPage
      surtitre="Nous écrire"
      titre="Contact"
      chapeau="Écrivez-nous à l'adresse qui correspond à votre demande — vous aurez une réponse plus vite."
    >
      <EditorialSection titre="Service, abonnement, paiement">
        <p>
          Pour une question sur un produit, un abonnement ou un paiement :{" "}
          <strong>
            <a href="mailto:support@germanpass.io">support@germanpass.io</a>
          </strong>{" "}
          (pour GermanPass).{" "}
          <ACompleter>adresses de support des autres produits, au fur et à mesure.</ACompleter>
        </p>
      </EditorialSection>

      <EditorialSection titre="Données personnelles">
        <p>
          Pour l&apos;accès, la rectification, la suppression ou la portabilité de vos données :{" "}
          <strong>
            <a href="mailto:rgpd@kebrane.com">rgpd@kebrane.com</a>
          </strong>
          .
        </p>
      </EditorialSection>

      <EditorialSection titre="La maison Kebrane">
        <p>
          Pour toute autre demande (presse, partenariat, information générale) :{" "}
          <strong>
            <a href="mailto:bonjour@kebrane.com">bonjour@kebrane.com</a>
          </strong>
          {/* Marqueur levé : cette adresse est DÉJÀ publiée comme contact de
              l'éditeur dans les Mentions légales. La laisser « à confirmer »
              ici, alors que le site l'affiche ailleurs sans réserve, ne
              protégeait de rien et se contredisait. */}
        </p>
      </EditorialSection>

      <EditorialSection titre="Adresse">
        <p>
          <ACompleter>
            adresse postale de l&apos;éditeur, si vous souhaitez l&apos;afficher.
          </ACompleter>
        </p>
      </EditorialSection>

      <p className="border-t border-border pt-8 text-sm italic">
        Un formulaire de contact pourra être ajouté plus tard ; au lancement, les adresses e-mail
        suffisent.
      </p>
    </EditorialPage>
  );
}

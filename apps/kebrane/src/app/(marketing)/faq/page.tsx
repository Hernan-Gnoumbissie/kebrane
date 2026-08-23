import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { EditorialPage, EditorialSection } from "@/components/editorial";
import { ACompleter } from "@/components/legal-document";

// Contenu : `docs/content/faq.md` (KB-32), repris mot pour mot.
export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Questions fréquentes sur le compte Kebrane, les abonnements, le paiement mobile money et les produits.",
  alternates: { canonical: "/faq" },
};

/**
 * Une question et sa réponse.
 *
 * Tout est déplié : pas d'accordéon. Une FAQ se parcourt à la recherche
 * (Ctrl+F) autant qu'à l'œil, et une réponse repliée n'est trouvée ni par
 * l'un ni par l'autre.
 */
function Question({ question, children }: { question: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="font-medium text-foreground">{question}</h3>
      {children}
    </div>
  );
}

export default function FaqPage() {
  return (
    <EditorialPage surtitre="Centre d'aide" titre="Questions fréquentes">
      <EditorialSection titre="Le compte Kebrane">
        <div className="space-y-6">
          <Question question="Qu'est-ce qu'un compte Kebrane ?">
            <p>
              Une identité unique qui donne accès à tous les produits de la maison Kebrane. Vous
              créez un compte une fois, puis vous souscrivez au(x) produit(s) qui vous intéressent.
            </p>
          </Question>

          <Question question="Un compte suffit-il pour tous les produits ?">
            <p>
              Oui pour l&apos;identité. Chaque produit a en revanche son{" "}
              <strong>propre abonnement</strong>.
            </p>
          </Question>

          <Question question="Comment supprimer mon compte ou exporter mes données ?">
            <p>
              Depuis <Link href="/hub/parametres">votre espace</Link>, dans les paramètres du
              compte. Voir aussi la{" "}
              <Link href="/confidentialite">Politique de confidentialité</Link>.
            </p>
          </Question>
        </div>
      </EditorialSection>

      <EditorialSection titre="Abonnements et paiement">
        <div className="space-y-6">
          <Question question="Comment payer ?">
            <p>
              Par <strong>mobile money</strong> : <strong>MTN Mobile Money</strong> et{" "}
              <strong>Orange Money</strong>.
            </p>
          </Question>

          <Question question="Quels sont les tarifs ?">
            <p>
              Les offres et leurs prix (en FCFA) sont affichés sur la page{" "}
              <Link href="/tarifs">Tarifs</Link>, toujours à jour.
            </p>
          </Question>

          <Question question="L'abonnement se renouvelle-t-il automatiquement ?">
            <p>
              <ACompleter>selon la politique retenue dans les CGV.</ACompleter>
            </p>
          </Question>

          <Question question="Puis-je être remboursé ?">
            <p>
              <ACompleter>selon la politique de remboursement des CGV.</ACompleter>
            </p>
          </Question>
        </div>
      </EditorialSection>

      <EditorialSection titre="Les produits">
        <div className="space-y-6">
          <Question question="GermanPass, c'est quoi ?">
            <p>
              La préparation aux examens d&apos;allemand, du niveau A1 au C2 : entraînement aux
              quatre compétences, sujets originaux, retours par IA à titre indicatif.
            </p>
          </Question>

          <Question question="Vos examens sont-ils officiels ?">
            <p>
              Non. Kebrane est <strong>indépendant</strong> des organismes certificateurs. Le
              contenu est un entraînement original qui respecte les structures publiques des
              épreuves.
            </p>
          </Question>
        </div>
      </EditorialSection>

      <EditorialSection titre="Une autre question ?">
        <p>
          Voir la page <Link href="/contact">Contact</Link>.
        </p>
      </EditorialSection>
    </EditorialPage>
  );
}

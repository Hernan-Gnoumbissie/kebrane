import type { Metadata } from "next";
import Link from "next/link";
import { ACompleter, LegalDocument, LegalSection } from "@/components/legal-document";

// Contenu : `docs/content/cgv.md` (KB-32), repris mot pour mot.
//
// ⚠ AUCUN montant ici (KB-34). La grille est éditée depuis l'administration et
// lue en base ; ces CGV renvoient à `/tarifs`, qui est la source unique. Figer
// un prix dans un document légal, c'est garantir qu'il sera faux le jour où
// l'administration le changera — et un prix faux dans des CGV est opposable.
export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
  description:
    "Vente des abonnements Kebrane : offres, prix affichés sur la page Tarifs, paiement mobile money, facturation.",
  alternates: { canonical: "/cgv" },
};

export default function CgvPage() {
  return (
    <LegalDocument
      titre="Conditions Générales de Vente (CGV)"
      miseAJour="Date d'effet : 23 août 2026"
      incomplet
    >
      <LegalSection titre="1. Objet">
        <p>
          Les présentes CGV encadrent la vente des abonnements aux Produits de la maison Kebrane,
          souscrits depuis un compte Kebrane. Elles complètent les <Link href="/cgu">CGU</Link>.
        </p>
      </LegalSection>

      <LegalSection titre="2. Produits et offres">
        <p>
          Chaque Produit dispose de sa ou ses offres d&apos;abonnement, dont le détail (contenu,
          durée, prix) est présenté sur la page <Link href="/tarifs">Tarifs</Link>. Cette page est
          la <strong>source de référence</strong> des offres en vigueur.
        </p>
      </LegalSection>

      <LegalSection titre="3. Prix">
        <p>
          Les prix sont affichés en <strong>FCFA (franc CFA, XAF)</strong> sur la page{" "}
          <Link href="/tarifs">Tarifs</Link>{" "}
          <ACompleter>préciser si TTC et la taxe applicable le cas échéant</ACompleter>. Kebrane
          peut modifier ses prix ; le prix applicable est celui{" "}
          <strong>affiché au moment de la commande</strong>.
        </p>
      </LegalSection>

      <LegalSection titre="4. Moyens de paiement">
        <p>
          Le paiement s&apos;effectue par <strong>mobile money</strong> :{" "}
          <strong>MTN Mobile Money</strong> et <strong>Orange Money</strong>. Le paiement peut
          transiter par un prestataire de paiement tiers{" "}
          <ACompleter>nom du prestataire une fois confirmé, ex. KPay</ACompleter>. L&apos;accès au
          Produit est activé après confirmation du paiement.
        </p>
      </LegalSection>

      <LegalSection titre="5. Reconduction">
        <p>
          <ACompleter>
            l&apos;abonnement est-il à reconduction automatique ou à réengagement manuel ?
            Préciser les modalités et la manière de résilier avant échéance.
          </ACompleter>
        </p>
      </LegalSection>

      <LegalSection titre="6. Droit de rétractation et contenu numérique">
        <p>
          Le service donne accès à un <strong>contenu numérique</strong> fourni immédiatement.{" "}
          <ACompleter>
            préciser la politique de rétractation applicable et la renonciation expresse : en
            accédant au contenu dès la souscription, l&apos;utilisateur reconnaît renoncer à son
            droit de rétractation, le cas échéant, selon le droit applicable.
          </ACompleter>
        </p>
      </LegalSection>

      <LegalSection titre="7. Remboursement">
        <p>
          <ACompleter>
            politique de remboursement — conditions, délais, cas d&apos;exclusion.
          </ACompleter>
        </p>
      </LegalSection>

      <LegalSection titre="8. Facturation">
        <p>Un justificatif de paiement est mis à disposition dans l&apos;espace du compte.</p>
      </LegalSection>

      <LegalSection titre="9. Droit applicable et litiges">
        <p>
          Régies par le <strong>droit camerounais</strong>. À défaut de résolution amiable, tout
          litige relève des <strong>juridictions de Douala, Cameroun</strong>.
        </p>
      </LegalSection>

      <LegalSection titre="10. Contact">
        <p>
          Questions sur un paiement ou un abonnement : voir <Link href="/contact">Contact</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

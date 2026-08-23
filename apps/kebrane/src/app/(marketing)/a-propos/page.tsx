import type { Metadata } from "next";
import Link from "next/link";
import { EditorialPage, EditorialSection } from "@/components/editorial";

// Contenu : `docs/content/a-propos.md` (KB-32), fondé sur les documents fondateurs
// `brand/docs/Le-Manifeste-de-Kebrane.md`, `L-Identite-verbale-Kebrane.md`,
// `Les-Principes-Produit-Kebrane.md`. Voix : claire, chaleureuse, honnête, sobre ;
// registre institutionnel (« nous » / « vous »).
export const metadata: Metadata = {
  title: "À propos",
  description:
    "Kebrane existe pour faire tomber les barrières que l'on n'a pas choisies — une langue, un examen, un certificat.",
  alternates: { canonical: "/a-propos" },
};

export default function AProposPage() {
  return (
    <EditorialPage surtitre="La maison" titre="À propos de Kebrane">
      <EditorialSection titre="Pourquoi nous existons">
        <p>
          Il y a des barrières que l&apos;on choisit, et des barrières que l&apos;on subit. Les
          premières nous font grandir. Les secondes décident, à notre place, de ce que nous avons
          le droit de devenir. <strong>Kebrane existe pour faire tomber les secondes.</strong>
        </p>
        <p>
          Partout, des personnes capables et déterminées sont arrêtées non par un manque de talent,
          mais par un obstacle qu&apos;elles n&apos;ont pas choisi : une langue, un examen, un
          certificat, un dossier. Ces barrières ne mesurent pas la valeur d&apos;une personne —
          seulement la distance entre elle et ceux qui ont écrit les règles.
        </p>
      </EditorialSection>

      <EditorialSection titre="Notre mission">
        <p>
          Kebrane est une <strong>maison</strong>. Sous un même toit, nous construisons des outils
          qui suppriment, un par un, les obstacles administratifs, linguistiques et de
          certification qui séparent les gens de la vie qu&apos;ils veulent mener — dans
          l&apos;éducation, l&apos;installation, et au-delà.
        </p>
        <p>
          Chaque produit fait tomber une barrière précise, pour une personne précise. Ce ne sont
          pas des destinations où retenir l&apos;utilisateur, mais{" "}
          <strong>des passerelles qu&apos;il traverse, puis qu&apos;il quitte, plus libre
          qu&apos;avant</strong>.
        </p>
      </EditorialSection>

      <EditorialSection titre="Ce que nous croyons">
        <ul>
          <li>
            <strong>Une barrière subie n&apos;est pas un destin.</strong> Ce qui a été dressé par
            des règles peut être franchi par de meilleurs outils.
          </li>
          <li>
            <strong>L&apos;autonomie de la personne passe avant tout le reste.</strong> Nous
            voulons rendre les gens libres — libres d&apos;obtenir ce qu&apos;ils cherchent, puis
            libres de partir.
          </li>
          <li>
            <strong>La langue ne doit jamais être un mur.</strong> Se faire comprendre est un
            droit, pas un privilège.
          </li>
          <li>
            <strong>La dignité n&apos;est pas une option.</strong> La clarté, l&apos;honnêteté et
            le respect ne sont pas des égards que l&apos;on ajoute : ce sont le produit lui-même.
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection titre="Notre promesse">
        <p>
          Nous ne promettons pas le succès — personne d&apos;honnête ne le peut. Nous promettons un
          chemin plus clair vers lui : dire la vérité tôt, montrer la prochaine étape, ne jamais
          faire tourner en rond. Nous nous jugeons non au temps que les gens passent chez nous,
          mais <strong>aux barrières qu&apos;ils ne rencontrent plus</strong>.
        </p>
        <p>
          Une règle nous départage quand tout le reste hésite : en cas de doute, nous choisissons
          l&apos;option qui rend la personne <strong>plus autonome</strong>, même lorsqu&apos;elle
          nous rapporte moins.
        </p>
      </EditorialSection>

      <EditorialSection titre="Nos produits">
        <p>
          Un compte Kebrane, tous les produits — chacun avec son propre abonnement, dans le même
          cadre clair et sobre. « By Kebrane » relie les produits sans les dominer.
        </p>
        <ul>
          <li>
            <strong>
              <Link href="/produits/germanpass">GermanPass</Link>
            </strong>{" "}
            — franchir les examens d&apos;allemand, du niveau A1 au C2. <em>Disponible.</em>
          </li>
          <li>
            <em>À venir</em> : <strong>TCFPass</strong> — le TCF pour le Canada, et{" "}
            <strong>PermitPass</strong> — le code de la route au Cameroun. D&apos;autres
            passerelles suivront, pour franchir un examen comme pour s&apos;installer.
            {/* Marqueur levé : les NOMS sont tranchés (registre Core), et la page
                n'annonce volontairement AUCUN ordre de sortie ni aucune date.
                Il n'y avait donc rien en attente — seulement une note interne
                affichée en public sur une promesse qu'on ne fait pas. */}
          </li>
        </ul>
        <p>
          Nos produits sont <strong>indépendants</strong> des organismes certificateurs : le
          contenu d&apos;entraînement est original, seules les structures publiques des épreuves
          sont respectées (voir <Link href="/mentions-legales">Mentions légales</Link>).
        </p>
      </EditorialSection>

      <EditorialSection titre="Ce que nous ne ferons jamais">
        <ul>
          <li>Retenir quelqu&apos;un contre son intérêt, ou lui rendre le départ difficile.</li>
          <li>Monétiser la détresse, ou faire payer plus cher celui qui est le plus coincé.</li>
          <li>Cacher la vérité, exagérer une promesse ou fabriquer l&apos;urgence pour vendre.</li>
          <li>Réduire une personne à un dossier, un requérant ou un usager.</li>
          <li>Dresser, à l&apos;intérieur, les barrières que nous combattons dehors.</li>
        </ul>
      </EditorialSection>

      <EditorialSection titre="Contact">
        <p>
          Une question, une idée, un partenariat ? <Link href="/contact">Contact</Link>.
        </p>
      </EditorialSection>
    </EditorialPage>
  );
}

/**
 * Migration ponctuelle — nommage produits « -Pass » (décision PO, 22 août 2026).
 *
 * Le registre déclaratif a changé de slugs ; le seed, lui, est un UPSERT PAR SLUG :
 * rejoué tel quel, il créerait `tcfpass` et `permitpass` À CÔTÉ de `tcf-canada` et
 * `permis-cameroun`, et le catalogue public afficherait les six. D'où ce script.
 *
 * Deux traitements, parce que ce sont deux situations différentes :
 *
 *  - `tcf-canada` → `tcfpass` et `permis-cameroun` → `permitpass` sont des
 *    RENOMMAGES. On met le slug à jour EN PLACE plutôt que de supprimer/recréer :
 *    l'`id` survit, donc tout ce qui pointerait dessus aussi. Le seed qui suit
 *    reconnaît alors la ligne et se contente d'actualiser nom et accroche.
 *
 *  - `gestion-formation` est un RETRAIT : aucun successeur. Passé en `DISABLED`
 *    plutôt que supprimé — la suppression est définitive, et un produit B2B
 *    « hors périmètre du Manifeste » aujourd'hui peut être repositionné demain.
 *
 * Idempotent : rejouable sans effet une fois la migration passée.
 *
 * ⚠ Ne s'applique qu'aux lignes SANS données rattachées (accès, paiements, offres,
 * mesures, événements). S'il y en avait, le script s'arrête : renommer un produit
 * qui a déjà servi mérite une décision, pas un script.
 */
import { db, ProductStatus } from "@kebrane/db";

const RENOMMAGES = [
  { avant: "tcf-canada", apres: "tcfpass" },
  { avant: "permis-cameroun", apres: "permitpass" },
];

const RETRAITS = ["gestion-formation"];

async function estVierge(productId: string): Promise<boolean> {
  const [acces, paiements, offres, mesures, evenements] = await Promise.all([
    db.productAccess.count({ where: { productId } }),
    db.payment.count({ where: { productId } }),
    db.plan.count({ where: { productId } }),
    db.productMetric.count({ where: { productId } }),
    db.event.count({ where: { productId } }),
  ]);
  return acces + paiements + offres + mesures + evenements === 0;
}

let touche = 0;

for (const { avant, apres } of RENOMMAGES) {
  const ancien = await db.product.findUnique({ where: { slug: avant } });
  if (!ancien) continue;

  if (!(await estVierge(ancien.id))) {
    console.error(
      `✗ ${avant} porte des données rattachées — renommage refusé, à trancher à la main.`
    );
    process.exit(1);
  }

  // Si le seed a déjà tourné avant cette migration, la cible existe peut-être
  // déjà en double. Dans ce cas c'est l'ANCIENNE ligne qui part : la nouvelle
  // est celle que le registre connaît.
  const cible = await db.product.findUnique({ where: { slug: apres } });
  if (cible) {
    if (!(await estVierge(ancien.id))) process.exit(1);
    await db.product.delete({ where: { id: ancien.id } });
    console.log(`✓ ${avant} supprimé (doublon de ${apres}, déjà créé par le seed)`);
  } else {
    await db.product.update({ where: { id: ancien.id }, data: { slug: apres } });
    console.log(`✓ ${avant} → ${apres} (renommé en place, id conservé)`);
  }
  touche++;
}

for (const slug of RETRAITS) {
  const produit = await db.product.findUnique({ where: { slug } });
  if (!produit || produit.status === ProductStatus.DISABLED) continue;

  await db.product.update({
    where: { id: produit.id },
    data: { status: ProductStatus.DISABLED },
  });
  console.log(`✓ ${slug} retiré du catalogue public (DISABLED, ligne conservée)`);
  touche++;
}

console.log(touche === 0 ? "Rien à migrer." : `${touche} produit(s) migré(s).`);
process.exit(0);

// @kebrane/core — droits RGPD actionnables : export et effacement (KB-28).
//
// La politique de confidentialité (KB-25) **promet** que le membre peut
// exporter ses données et supprimer son compte depuis son espace. Une promesse
// de ce genre ne peut pas rester un paragraphe : ce fichier est ce qui la rend
// vraie.
//
// Les deux opérations vivent dans Core et non dans l'application : ce sont des
// opérations de DOMAINE (elles touchent comptes, accès, paiements, journal), et
// la frontière v0.2 interdit à une page d'aller les faire elle-même.
import { db } from "@kebrane/db";
import type { Account } from "@kebrane/db";
import { Role } from "@kebrane/db";
import { events } from "./index";

/** Contenu remis au membre qui exerce son droit de portabilité. */
export interface AccountExport {
  /** Horodatage de génération — un export est une photo, pas un flux. */
  genereLe: string;
  compte: {
    id: string;
    email: string;
    nom: string;
    role: string;
    creeLe: Date;
    dernierPassage: Date | null;
  };
  accesProduits: {
    produit: string;
    statut: string;
    offre: string | null;
    expireLe: Date | null;
    capacites: string[];
    enveloppeIaMicroUsd: number;
    consommeIaMicroUsd: number;
  }[];
  paiements: {
    produit: string;
    offre: string;
    montant: number;
    devise: string;
    canal: string;
    statut: string;
    demandeLe: Date;
    confirmeLe: Date | null;
  }[];
  journal: {
    type: string;
    gravite: string;
    quand: Date;
  }[];
}

/**
 * Adresse de remplacement d'un compte effacé.
 *
 * `.invalid` est un TLD réservé (RFC 2606) : l'adresse ne peut donc appartenir
 * à personne, et rien ne partira jamais dessus. Elle reste unique par compte
 * parce que la colonne l'exige.
 */
function adresseEffacee(accountId: string): string {
  return `supprime-${accountId}@comptes.kebrane.invalid`;
}

/** Un compte déjà effacé ne doit pas l'être deux fois (ni journalisé deux fois). */
function dejaEfface(account: Account): boolean {
  return account.email === adresseEffacee(account.id);
}

export const privacy = {
  /**
   * Export des données d'un compte (droit d'accès et de portabilité).
   *
   * Ne contient QUE les données du compte demandeur. Le journal est exporté
   * sans son champ `data` : celui-ci porte des détails techniques et,
   * ponctuellement, des identifiants de tiers (références fournisseur) qui ne
   * sont pas les données personnelles du membre.
   */
  async exportAccount(accountId: string): Promise<AccountExport | null> {
    const account = await db.account.findUnique({ where: { id: accountId } });
    if (!account) return null;

    const [acces, paiements, journal] = await Promise.all([
      db.productAccess.findMany({ where: { accountId }, include: { product: true } }),
      db.payment.findMany({ where: { accountId }, orderBy: { createdAt: "asc" } }),
      db.event.findMany({
        where: { accountId },
        orderBy: { createdAt: "asc" },
        select: { type: true, severity: true, createdAt: true },
      }),
    ]);

    const produits = new Map(
      (await db.product.findMany()).map((p) => [p.id, p.name] as const)
    );

    const contenu: AccountExport = {
      genereLe: new Date().toISOString(),
      compte: {
        id: account.id,
        email: account.email,
        nom: account.name,
        role: account.role,
        creeLe: account.createdAt,
        dernierPassage: account.lastSeenAt,
      },
      accesProduits: acces.map((a) => ({
        produit: a.product.name,
        statut: a.status,
        offre: a.plan,
        expireLe: a.expiresAt,
        capacites: a.capabilities,
        enveloppeIaMicroUsd: a.aiBudgetMicroUsd,
        consommeIaMicroUsd: a.aiUsedMicroUsd,
      })),
      paiements: paiements.map((p) => ({
        produit: produits.get(p.productId) ?? p.productId,
        offre: p.plan,
        montant: p.amount,
        devise: p.currency,
        canal: p.channel,
        statut: p.status,
        demandeLe: p.createdAt,
        confirmeLe: p.confirmedAt,
      })),
      journal: journal.map((e) => ({
        type: e.type,
        gravite: e.severity,
        quand: e.createdAt,
      })),
    };

    // Remettre à quelqu'un l'intégralité de ses données est une divulgation :
    // ça se trace, au même titre qu'un changement de privilège.
    await events.log({
      type: "account.data_exported",
      severity: "IMPORTANT",
      accountId,
      data: {
        acces: contenu.accesProduits.length,
        paiements: contenu.paiements.length,
        evenements: contenu.journal.length,
      },
    });

    return contenu;
  },

  /**
   * Efface les données personnelles d'un compte (droit à l'effacement).
   *
   * **Anonymisation, pas suppression de ligne.** Le compte porte l'historique
   * comptable (`Payment`), que la loi impose de conserver et que le support
   * doit pouvoir consulter pour répondre à « où est passé mon argent ». On
   * retire donc ce qui identifie la personne, et on garde ce qui doit survivre :
   *
   *  - identité (nom, e-mail, lien Clerk, dernier passage) : effacée ;
   *  - rôle : ramené à `MEMBER` — un compte effacé ne conserve pas de privilège ;
   *  - accès produits : supprimés, c'est un ÉTAT, pas une archive ;
   *  - paiements : conservés, mais le numéro mobile money (donnée personnelle)
   *    est retiré ;
   *  - journal : conservé — c'est la piste d'audit, et elle doit précisément
   *    pouvoir attester de l'effacement lui-même.
   *
   * Idempotent : rejouer sur un compte déjà effacé ne réécrit rien et
   * n'ajoute pas de ligne au journal.
   */
  async eraseAccount(
    accountId: string,
    options: { source?: string } = {}
  ): Promise<Account | null> {
    const account = await db.account.findUnique({ where: { id: accountId } });
    if (!account) return null;
    if (dejaEfface(account)) return account;

    const [accesSupprimes, paiementsAnonymises] = await Promise.all([
      db.productAccess.deleteMany({ where: { accountId } }),
      db.payment.updateMany({ where: { accountId }, data: { phone: null } }),
    ]);

    const efface = await db.account.update({
      where: { id: accountId },
      data: {
        email: adresseEffacee(accountId),
        name: "Compte supprimé",
        clerkUserId: null,
        lastSeenAt: null,
        role: Role.MEMBER,
      },
    });

    await events.log({
      type: "account.erased",
      severity: "IMPORTANT",
      accountId,
      data: {
        source: options.source ?? "service",
        accesSupprimes: accesSupprimes.count,
        paiementsAnonymises: paiementsAnonymises.count,
        // Surtout pas l'ancienne adresse : la journaliser reviendrait à garder
        // en clair exactement la donnée qu'on vient d'effacer.
        roleAvant: account.role,
      },
    });

    return efface;
  },
};

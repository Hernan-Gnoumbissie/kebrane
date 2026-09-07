// @kebrane/core — catalogue des événements de la plateforme (KB-14).
//
// **Pourquoi un catalogue.** Jusqu'ici, chaque appelant choisissait librement
// le type ET la gravité de l'événement qu'il émettait. Rien ne garantissait
// qu'un même événement soit journalisé de la même façon partout, et personne ne
// pouvait répondre à « quels événements existent ? » sans relire tout le code.
//
// Le catalogue répond aux deux : il énumère ce qui existe, fixe la gravité par
// défaut de chaque type, et dit **qui doit être prévenu**.
//
// Les trois gravités (v0.2) :
//  - `INFO`            : trace. On la consulte, on n'en est pas averti.
//  - `IMPORTANT`       : à savoir. Change l'état d'un compte ou d'un accès.
//  - `ACTION_REQUIRED` : quelqu'un doit agir. C'est le seul niveau qui dérange.

export type Severity = "INFO" | "IMPORTANT" | "ACTION_REQUIRED";

/** Qui est prévenu, en plus de l'écriture au journal (toujours faite). */
export type Audience =
  /** Le membre concerné, par e-mail. */
  | "member"
  /** Le personnel (STAFF/ADMIN) : incidents et paiements à valider. */
  | "staff";

export interface EventDefinition {
  /** Gravité par défaut. Un appelant peut l'affiner si le CONTEXTE la change
   *  (ex. un accès qui s'ouvre est plus notable qu'un accès qui se ferme). */
  severity: Severity;
  /** Libellé lisible — utilisé dans les e-mails et la console d'administration. */
  label: string;
  /** Destinataires à prévenir. Vide = journal seulement. */
  notify: Audience[];
}

/**
 * ⚠ Tout type émis par le code DOIT figurer ici — un test le vérifie.
 * Un événement absent du catalogue serait invisible : ni routé, ni documenté.
 */
export const EVENT_CATALOG = {
  // --- Comptes ------------------------------------------------------------
  "account.created": {
    severity: "INFO",
    label: "Compte Kebrane créé",
    notify: [],
  },
  "account.clerk_linked": {
    severity: "IMPORTANT",
    label: "Identité de connexion rattachée au compte",
    // Le membre est prévenu : c'est un changement de sécurité. Quelqu'un qui
    // n'en est pas l'auteur doit pouvoir s'en alarmer.
    notify: ["member"],
  },
  "account.clerk_unlinked": {
    severity: "IMPORTANT",
    label: "Identité de connexion détachée du compte",
    notify: [],
  },
  "account.data_exported": {
    severity: "IMPORTANT",
    label: "Données du compte exportées",
    // Journal seulement : c'est le membre lui-même qui déclenche l'export
    // depuis son espace, il n'a pas à recevoir un e-mail le lui annonçant.
    notify: [],
  },
  "account.erased": {
    severity: "IMPORTANT",
    label: "Compte effacé à la demande du membre (RGPD)",
    // Ni le membre — son adresse vient d'être effacée, il n'y a plus où
    // écrire — ni le personnel : un départ n'est pas un incident. La console
    // d'administration compte les événements, c'est le bon endroit.
    notify: [],
  },
  "account.role_changed": {
    severity: "IMPORTANT",
    label: "Rôle modifié",
    // Le personnel, pas le membre : une élévation de privilège doit être vue
    // par quelqu'un d'autre que son bénéficiaire.
    notify: ["staff"],
  },

  // --- Accès produit ------------------------------------------------------
  "product_access.changed": {
    severity: "INFO",
    label: "Accès produit modifié",
    notify: [],
  },
  "product_access.denied_observed": {
    severity: "INFO",
    label: "Refus d'accès observé (mode observation, KB-08)",
    notify: [],
  },

  // --- Paiements ----------------------------------------------------------
  "payment.requested": {
    severity: "INFO",
    label: "Paiement demandé",
    notify: [],
  },
  "payment.confirmed": {
    severity: "IMPORTANT",
    label: "Paiement confirmé — accès ouvert",
    // L'e-mail qui compte le plus pour le membre : il vient de payer.
    notify: ["member"],
  },
  "payment.failed": {
    severity: "ACTION_REQUIRED",
    label: "Paiement en échec",
    notify: ["member", "staff"],
  },

  // --- Offres -------------------------------------------------------------
  "plan.created": {
    severity: "IMPORTANT",
    label: "Offre créée",
    notify: [],
  },
  "plan.changed": {
    severity: "IMPORTANT",
    label: "Offre modifiée (prix ou composition)",
    // Toucher à un prix se voit : le personnel en est averti.
    notify: ["staff"],
  },

  // --- Exploitation -------------------------------------------------------
  "ai_budget.exhausted": {
    severity: "ACTION_REQUIRED",
    label: "Enveloppe IA épuisée",
    // Le membre doit savoir POURQUOI la correction ne part pas.
    notify: ["member"],
  },
  "app.error": {
    severity: "ACTION_REQUIRED",
    label: "Erreur applicative",
    // Surtout pas le membre. Et pas d'e-mail au personnel non plus : une panne
    // en cascade produirait des milliers de messages et masquerait le signal.
    // La console d'administration les compte (KB-15), c'est le bon endroit.
    notify: [],
  },
} as const satisfies Record<string, EventDefinition>;

export type EventType = keyof typeof EVENT_CATALOG;

export function isCatalogued(type: string): type is EventType {
  return type in EVENT_CATALOG;
}

/** Définition d'un type, ou `null` s'il n'est pas au catalogue. */
export function eventDefinition(type: string): EventDefinition | null {
  return isCatalogued(type) ? EVENT_CATALOG[type] : null;
}

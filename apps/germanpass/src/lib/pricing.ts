/**
 * Offres et modes de paiement affichés sur /pricing.
 * ⚠️ Montants à PERSONNALISER ci-dessous ; les coordonnées de paiement se
 * configurent dans .env (PAYMENT_ORANGE_MONEY, PAYMENT_MTN_MOMO, PAYMENT_PAYPAL).
 * Les durées (7/30/90/365 j) correspondent aux validations admin (ALLOWED_GRANT_DAYS).
 */
import { env } from "@/lib/env";
import { getKebranePlans, estimatedMicroUsd } from "@/lib/kebrane";

export type Offer = {
  days: 7 | 30 | 90 | 365;
  /** Slug de l'offre en base (KB-13). Absent sur le repli local (pas de paiement auto). */
  slug?: string;
  name: string;
  priceXaf: number; // FCFA
  description: string;
  /** Corrections IA incluses. Absent sur le repli local, qui ne les connaît pas. */
  corrections?: number;
  highlight?: boolean;
};

/**
 * Grille LOCALE — désormais un REPLI, plus la source de vérité (KB-13).
 *
 * Le catalogue vit dans Core (`plans`), où l'administrateur pourra en fixer prix
 * et composition. Cette liste ne sert que si Core est indisponible ou si le seed
 * n'a jamais été joué : mieux vaut une vitrine servie par un repli qu'une page
 * en erreur. Elle doit donc rester alignée sur `PLAN_REGISTRY`.
 */
export const OFFERS: Offer[] = [
  {
    days: 7,
    name: "Découverte",
    priceXaf: 2_500,
    description: "1 semaine d'accès — idéal pour essayer la plateforme.",
  },
  {
    days: 30,
    name: "Intensif",
    priceXaf: 8_000,
    description: "1 mois d'accès — préparation rapprochée de l'examen.",
    highlight: true,
  },
  {
    days: 90,
    name: "Trimestre",
    priceXaf: 20_000,
    description: "3 mois d'accès — progression complète sur un niveau.",
  },
  {
    days: 365,
    name: "Année",
    priceXaf: 60_000,
    description: "12 mois d'accès — parcours A1 → C2 sans interruption.",
  },
];

/**
 * Nombre de corrections écrites que représente une enveloppe IA.
 *
 * On compte en dollars et on AFFICHE en corrections : « 40 corrections
 * incluses » se comprend sans calcul, là où un solde de points obligerait le
 * membre à faire de l'arithmétique avant chaque action — et donc à se rationner.
 *
 * ⚠ Le diviseur est une ESTIMATION (voir `lib/kebrane.ts`), pas une mesure :
 * ce nombre est un ordre de grandeur, à réviser avec `ai:cost`.
 */
export function correctionsIncluses(aiBudgetMicroUsd: number): number {
  return Math.floor(aiBudgetMicroUsd / estimatedMicroUsd("writing_eval"));
}

/**
 * Offres à afficher : le catalogue Core s'il répond, la grille locale sinon.
 * Source unique en fonctionnement normal ; repli seulement en cas de panne.
 */
export async function getOffers(): Promise<{ offers: Offer[]; source: "core" | "repli" }> {
  const plans = await getKebranePlans();
  if (!plans) return { offers: OFFERS, source: "repli" };

  return {
    source: "core",
    offers: plans.map((p) => ({
      days: p.durationDays as Offer["days"],
      slug: p.slug,
      name: p.name,
      priceXaf: p.priceAmount,
      description: p.description ?? "",
      corrections: correctionsIncluses(p.aiBudgetMicroUsd),
      highlight: p.slug === "intensif",
    })),
  };
}

export type PaymentMethod = {
  name: string;
  details: string;
  note?: string;
};

/**
 * Moyens de paiement lus depuis .env (PAYMENT_ORANGE_MONEY, PAYMENT_MTN_MOMO,
 * PAYMENT_PAYPAL). Les moyens non renseignés sont masqués sur /pricing.
 */
export function getPaymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  if (env.PAYMENT_ORANGE_MONEY) {
    methods.push({
      name: "Orange Money",
      details: env.PAYMENT_ORANGE_MONEY,
      note: "Indiquez votre adresse e-mail d'inscription en référence.",
    });
  }
  if (env.PAYMENT_MTN_MOMO) {
    methods.push({
      name: "MTN Mobile Money",
      details: env.PAYMENT_MTN_MOMO,
      note: "Indiquez votre adresse e-mail d'inscription en référence.",
    });
  }
  if (env.PAYMENT_PAYPAL) {
    methods.push({
      name: "PayPal",
      details: env.PAYMENT_PAYPAL,
      note: "Indiquez votre adresse e-mail d'inscription dans la note du paiement.",
    });
  }
  return methods;
}

/** Étapes affichées au candidat. */
export const ACTIVATION_STEPS = [
  "Choisissez votre formule et effectuez le paiement via l'un des moyens ci-dessous.",
  "Prenez une capture ou photo du reçu de paiement.",
  "Connectez-vous puis envoyez la preuve depuis « Mon compte » (JPEG, PNG, WEBP ou PDF).",
  "Un administrateur valide votre compte sous 24 h ouvrées — votre accès démarre alors pour la durée payée.",
];

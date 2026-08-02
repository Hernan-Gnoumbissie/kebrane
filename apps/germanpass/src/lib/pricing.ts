/**
 * Offres et modes de paiement affichés sur /pricing.
 * ⚠️ Montants à PERSONNALISER ci-dessous ; les coordonnées de paiement se
 * configurent dans .env (PAYMENT_ORANGE_MONEY, PAYMENT_MTN_MOMO, PAYMENT_PAYPAL).
 * Les durées (7/30/90/365 j) correspondent aux validations admin (ALLOWED_GRANT_DAYS).
 */
import { env } from "@/lib/env";

export type Offer = {
  days: 7 | 30 | 90 | 365;
  name: string;
  priceXaf: number; // FCFA — à personnaliser
  description: string;
  highlight?: boolean;
};

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

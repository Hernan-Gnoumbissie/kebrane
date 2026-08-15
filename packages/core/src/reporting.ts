// @kebrane/core — indicateurs de pilotage (KB-15).
//
// « Les 7 chiffres, pas de sur-outillage » (v0.2). Ce module est la SEULE porte
// de l'app d'administration vers ces données : même discipline que pour les
// produits — on ne lit pas les tables depuis une app, même une app maison.
//
// Deux des sept indicateurs demandés ne sont PAS servis ici, et c'est délibéré :
// la progression pédagogique et le détail des erreurs applicatives sont des
// données de PRODUIT, pas de plateforme. Les faire remonter suppose que chaque
// produit les publie via le journal d'événements. Afficher un zéro à leur place
// serait pire que de dire qu'ils ne sont pas encore instrumentés.
import { db } from "@kebrane/db";
import { AccessStatus, PaymentStatus } from "@kebrane/db";

export interface PlatformStats {
  /** Comptes Kebrane créés. */
  inscrits: number;
  /** Comptes ayant au moins un accès produit actif et non échu. */
  abonnementsActifs: number;
  /** Somme encaissée (paiements confirmés), par devise. */
  revenus: { currency: string; total: number }[];
  /** Paiements en échec — un chiffre qui appelle une action, pas une statistique. */
  paiementsEchoues: number;
  /** Comptes vus au cours des 30 derniers jours. */
  actifs30j: number;
  /** Dernier passage constaté, tous comptes confondus. */
  dernierPassage: Date | null;
  /** Événements de gravité ACTION_REQUIRED non encore traités (journal d'alertes). */
  alertes: number;
}

export interface AlerteRecente {
  id: string;
  type: string;
  createdAt: Date;
  accountId: string | null;
  data: unknown;
}

export const reporting = {
  /**
   * Les indicateurs de la page d'accueil de l'administration.
   *
   * Une seule fonction plutôt que sept : ces chiffres sont lus ensemble, et les
   * séparer multiplierait les allers-retours vers la base pour rien.
   */
  async platformStats(now = new Date()): Promise<PlatformStats> {
    const ilYa30Jours = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [inscrits, abonnementsActifs, paiementsEchoues, actifs30j, alertes, dernier, sommes] =
      await Promise.all([
        db.account.count(),
        db.productAccess.count({
          where: {
            status: AccessStatus.ACTIVE,
            // Un accès échu n'est plus un abonnement, quoi qu'en dise son statut.
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        }),
        db.payment.count({ where: { status: PaymentStatus.FAILED } }),
        db.account.count({ where: { lastSeenAt: { gte: ilYa30Jours } } }),
        db.event.count({ where: { severity: "ACTION_REQUIRED" } }),
        db.account.findFirst({
          where: { lastSeenAt: { not: null } },
          orderBy: { lastSeenAt: "desc" },
          select: { lastSeenAt: true },
        }),
        // Groupé par devise : additionner des XAF et des EUR donnerait un nombre
        // qui ne veut rien dire.
        db.payment.groupBy({
          by: ["currency"],
          where: { status: PaymentStatus.CONFIRMED },
          _sum: { amount: true },
        }),
      ]);

    return {
      inscrits,
      abonnementsActifs,
      revenus: sommes.map((s) => ({ currency: s.currency, total: s._sum.amount ?? 0 })),
      paiementsEchoues,
      actifs30j,
      dernierPassage: dernier?.lastSeenAt ?? null,
      alertes,
    };
  },

  /**
   * Publie un indicateur produit (KB-15). Idempotent par (produit, clé) :
   * chaque publication remplace la précédente — on veut l'état courant, pas un
   * historique que personne ne relira.
   */
  async publishMetric(input: {
    productSlug: string;
    key: string;
    value: number;
    label?: string;
    unit?: string;
  }): Promise<void> {
    const product = await db.product.findUnique({ where: { slug: input.productSlug } });
    if (!product) return; // produit hors registre : rien à rattacher

    const data = {
      value: input.value,
      label: input.label ?? null,
      unit: input.unit ?? null,
      capturedAt: new Date(),
    };
    await db.productMetric.upsert({
      where: { productId_key: { productId: product.id, key: input.key } },
      update: data,
      create: { productId: product.id, key: input.key, ...data },
    });
  },

  /**
   * Retire un indicateur (KB-15).
   *
   * Indispensable, et pas symétrique par confort : `publishMetric` étant un
   * upsert, une mesure devenue indisponible continuerait sinon d'afficher sa
   * DERNIÈRE valeur, indéfiniment et sans que rien ne le signale. Un chiffre
   * périmé est plus dangereux qu'un chiffre absent.
   */
  async retractMetric(productSlug: string, key: string): Promise<void> {
    const product = await db.product.findUnique({ where: { slug: productSlug } });
    if (!product) return;
    await db.productMetric.deleteMany({ where: { productId: product.id, key } });
  },

  /** Indicateurs publiés par les produits, les plus récents d'abord. */
  async productMetrics(): Promise<
    { productName: string; key: string; value: number; label: string | null; unit: string | null; capturedAt: Date }[]
  > {
    const rows = await db.productMetric.findMany({
      orderBy: { capturedAt: "desc" },
      include: { product: { select: { name: true } } },
    });
    return rows.map((r) => ({
      productName: r.product.name,
      key: r.key,
      value: r.value,
      label: r.label,
      unit: r.unit,
      capturedAt: r.capturedAt,
    }));
  },

  /** Dernières alertes du journal — ce qui demande une action humaine. */
  async alertesRecentes(limit = 10): Promise<AlerteRecente[]> {
    const rows = await db.event.findMany({
      where: { severity: "ACTION_REQUIRED" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, type: true, createdAt: true, accountId: true, data: true },
    });
    return rows;
  },
};

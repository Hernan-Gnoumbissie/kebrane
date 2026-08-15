/**
 * Publie les indicateurs de GermanPass vers la plateforme Kebrane (KB-15).
 *
 *   pnpm --filter @kebrane/germanpass kebrane:metrics
 *
 * À passer périodiquement (cron quotidien). Pourquoi un script et non un calcul
 * fait par Core : la progression pédagogique est une notion MÉTIER — leçons,
 * statuts, scores. Core ne saurait pas la calculer sans connaître le domaine de
 * GermanPass, et le lui apprendre casserait la frontière v0.2. Le produit
 * calcule, la plateforme conserve et affiche.
 *
 * Passe par l'interface de services (`reporting.publishMetric`), jamais par les
 * tables Core.
 */
import { db } from "@/lib/db";
import { reporting } from "@kebrane/core";
import { GERMANPASS_SLUG, CORE_ENABLED } from "@/lib/kebrane";

/** Toutes les clés que ce script gère — sert à rétracter celles qu'il n'a pas pu produire. */
const TOUTES_LES_CLES = [
  "progression.lecons_terminees",
  "progression.score_moyen",
  "progression.lecons_engagees",
] as const;

async function main(): Promise<void> {
  if (!CORE_ENABLED) {
    console.error("KEBRANE_DATABASE_URL absent : rien à publier.");
    process.exitCode = 1;
    return;
  }

  // --- Progression moyenne : part des leçons engagées qui sont terminées -----
  // Rapportée aux leçons ENGAGÉES et non au catalogue entier : un catalogue qui
  // s'enrichit ferait autrement chuter l'indicateur sans que personne n'ait
  // régressé.
  const [engagees, terminees] = await Promise.all([
    db.lessonProgress.count({ where: { status: { not: "NOT_STARTED" } } }),
    db.lessonProgress.count({ where: { status: "COMPLETED" } }),
  ]);
  const progression = engagees === 0 ? 0 : Math.round((terminees / engagees) * 1000) / 10;

  // --- Score moyen aux mini-tests ------------------------------------------
  const scores = await db.lessonProgress.aggregate({
    where: { bestScore: { not: null } },
    _avg: { bestScore: true },
    _count: { _all: true },
  });

  /**
   * Une moyenne sans échantillon N'EST PAS zéro.
   *
   * Publier `0` quand aucune leçon n'a de score le ferait lire « tout le monde
   * a eu zéro » — un faux signal, et le genre de chiffre sur lequel on prend de
   * mauvaises décisions. On ne publie donc rien tant qu'il n'y a rien à dire :
   * la console affiche alors l'absence, ce qui est la vérité.
   */
  const mesures = [
    engagees > 0 && {
      key: "progression.lecons_terminees",
      value: progression,
      label: "Leçons terminées (sur engagées)",
      unit: "%",
    },
    scores._count._all > 0 && {
      key: "progression.score_moyen",
      value: Math.round((scores._avg.bestScore ?? 0) * 10) / 10,
      label: "Score moyen aux mini-tests",
      unit: "%",
    },
    {
      key: "progression.lecons_engagees",
      value: engagees,
      label: "Leçons engagées",
      unit: "",
    },
  ].filter((m): m is { key: string; value: number; label: string; unit: string } => Boolean(m));

  for (const m of mesures) {
    await reporting.publishMetric({ productSlug: GERMANPASS_SLUG, ...m });
    console.log(`  ✓ ${m.key.padEnd(32)} ${m.value}${m.unit}`);
  }

  // Rétracter ce qu'on ne publie plus : `publishMetric` étant un upsert, une
  // mesure devenue indisponible garderait sinon sa dernière valeur à l'écran,
  // indéfiniment. Un chiffre périmé trompe plus qu'un chiffre absent.
  const publiees = new Set(mesures.map((m) => m.key));
  const omises = TOUTES_LES_CLES.filter((k) => !publiees.has(k));
  for (const key of omises) {
    await reporting.retractMetric(GERMANPASS_SLUG, key);
    console.log(`  · ${key.padEnd(32)} omis faute d'échantillon (retiré, pas publié à 0)`);
  }
  console.log(`\n${mesures.length} indicateur(s) publié(s) pour ${GERMANPASS_SLUG}.`);
}

main()
  .catch((e) => {
    console.error("[publish-metrics] échec :", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

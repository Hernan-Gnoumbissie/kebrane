import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { getKebranePlans, updateKebranePlan } from "@/lib/kebrane";
import { ALL_CAPABILITIES, isKnownCapability, type Capability } from "@kebrane/core";

/**
 * Administration des offres (KB-13).
 *
 * ⚠ Emplacement provisoire : les offres sont un objet de PLATEFORME, leur écran
 * a vocation à rejoindre `apps/admin` (KB-15). Il vit ici parce que c'est là que
 * les administrateurs sont déjà.
 *
 * Toute écriture passe par `plans.upsert()` — jamais par les tables Core — et se
 * journalise en gravité IMPORTANT avec `source: admin-germanpass` : modifier un
 * prix, c'est toucher à de l'argent.
 */

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const plans = await getKebranePlans();
    return Response.json({
      plans: plans ?? [],
      // Le CODE dit ce qui existe : l'écran ne propose que ces clés, il n'en
      // invente aucune (KB-13).
      capabilities: ALL_CAPABILITIES,
      coreAvailable: plans !== null,
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function PUT(req: Request): Promise<Response> {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      slug?: string;
      name?: string;
      description?: string;
      priceAmount?: number;
      durationDays?: number;
      capabilities?: string[];
      aiBudgetMicroUsd?: number;
      sortOrder?: number;
    };

    if (!body.slug || !body.name) {
      return Response.json({ error: "slug et name requis" }, { status: 400 });
    }
    // Validation ici ET dans Core : celle-ci rend une erreur lisible à
    // l'administrateur, celle de Core protège le domaine quel que soit l'appelant.
    if (!Number.isInteger(body.priceAmount) || (body.priceAmount as number) < 0) {
      return Response.json({ error: "Prix : entier positif attendu" }, { status: 400 });
    }
    if (!Number.isInteger(body.durationDays) || (body.durationDays as number) <= 0) {
      return Response.json({ error: "Durée : nombre de jours > 0 attendu" }, { status: 400 });
    }
    if (!Number.isInteger(body.aiBudgetMicroUsd) || (body.aiBudgetMicroUsd as number) < 0) {
      return Response.json({ error: "Enveloppe IA : entier positif attendu" }, { status: 400 });
    }
    const capabilities = body.capabilities ?? [];
    const inconnue = capabilities.find((c) => !isKnownCapability(c));
    if (inconnue) {
      return Response.json({ error: `Capacité inconnue : ${inconnue}` }, { status: 400 });
    }

    const plan = await updateKebranePlan({
      slug: body.slug,
      name: body.name,
      description: body.description,
      priceAmount: body.priceAmount as number,
      durationDays: body.durationDays as number,
      capabilities: capabilities as Capability[],
      aiBudgetMicroUsd: body.aiBudgetMicroUsd as number,
      sortOrder: body.sortOrder,
    });

    return Response.json({ plan });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    // L'administrateur DOIT savoir qu'un changement de prix n'a pas pris.
    const message = e instanceof Error ? e.message : "Erreur interne";
    console.error("[admin/offres] échec :", e);
    return Response.json({ error: message }, { status: 500 });
  }
}

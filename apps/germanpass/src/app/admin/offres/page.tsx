"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationDays: number;
  capabilities: string[];
  aiBudgetMicroUsd: number;
  active: boolean;
  sortOrder: number;
};

/** Libellés lisibles des capacités. Le CODE fait foi sur ce qui existe. */
const LABELS: Record<string, string> = {
  "lesson.read": "Cours",
  "exam.run": "Examens blancs",
  "progress.view": "Progression",
  "correction.writing": "Correction écrite",
  "correction.speaking": "Correction orale",
  "tutor.chat": "Chat de leçon (non implémenté)",
  "library.dictionary": "Dictionnaire (non implémenté)",
};

/**
 * Coût estimé d'une correction écrite, en micro-dollars — doit rester aligné sur
 * `ESTIMATED_MICRO_USD` de `lib/kebrane.ts`. Sert uniquement à traduire une
 * enveloppe en nombre de corrections pour l'administrateur.
 */
const MICRO_PAR_CORRECTION = 25_000;

export default function AdminOffresPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [coreAvailable, setCoreAvailable] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/offres");
    if (!res.ok) {
      setErr("Chargement impossible.");
      return;
    }
    const data: { plans: Plan[]; capabilities: string[]; coreAvailable: boolean } =
      await res.json();
    setPlans(data.plans);
    setCapabilities(data.capabilities);
    setCoreAvailable(data.coreAvailable);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(plan: Plan, e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const res = await fetch("/api/admin/offres", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: plan.slug,
        name: plan.name,
        description: plan.description ?? undefined,
        priceAmount: plan.priceAmount,
        durationDays: plan.durationDays,
        capabilities: plan.capabilities,
        aiBudgetMicroUsd: plan.aiBudgetMicroUsd,
        sortOrder: plan.sortOrder,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(data.error ?? "Enregistrement refusé.");
      return;
    }
    setOk(`« ${plan.name} » enregistrée.`);
    await load();
  }

  function patch(slug: string, change: Partial<Plan>) {
    setPlans((list) => list.map((p) => (p.slug === slug ? { ...p, ...change } : p)));
  }

  return (
    <main className="container max-w-4xl space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Offres et tarifs</h1>
        <p className="text-sm text-muted-foreground">
          Ces valeurs pilotent la page publique des tarifs et ce que le membre obtient après
          paiement. Chaque modification est journalisée.
        </p>
      </div>

      {!coreAvailable ? (
        <p role="alert" className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
          Le catalogue Kebrane est injoignable : la page des tarifs affiche actuellement sa
          grille de repli. Aucune modification n&apos;est possible d&apos;ici.
        </p>
      ) : null}
      {err ? (
        <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          {ok}
        </p>
      ) : null}

      <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        Une modification ne change <strong>que les achats à venir</strong>. Ce qu&apos;un
        membre a déjà payé est figé au moment de son achat et reste dû.
      </p>

      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader>
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <CardDescription>
              Identifiant <code>{plan.slug}</code> — non modifiable, il relie les paiements
              existants à cette offre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => save(plan, e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor={`name-${plan.slug}`}>Nom affiché</Label>
                  <Input
                    id={`name-${plan.slug}`}
                    value={plan.name}
                    onChange={(e) => patch(plan.slug, { name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`price-${plan.slug}`}>Prix ({plan.currency})</Label>
                  <Input
                    id={`price-${plan.slug}`}
                    type="number"
                    min={0}
                    value={plan.priceAmount}
                    onChange={(e) =>
                      patch(plan.slug, { priceAmount: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`days-${plan.slug}`}>Durée (jours)</Label>
                  <Input
                    id={`days-${plan.slug}`}
                    type="number"
                    min={1}
                    value={plan.durationDays}
                    onChange={(e) =>
                      patch(plan.slug, { durationDays: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`desc-${plan.slug}`}>Description</Label>
                <Input
                  id={`desc-${plan.slug}`}
                  value={plan.description ?? ""}
                  onChange={(e) => patch(plan.slug, { description: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`ai-${plan.slug}`}>Corrections IA incluses</Label>
                <Input
                  id={`ai-${plan.slug}`}
                  type="number"
                  min={0}
                  value={Math.floor(plan.aiBudgetMicroUsd / MICRO_PAR_CORRECTION)}
                  onChange={(e) =>
                    patch(plan.slug, {
                      aiBudgetMicroUsd: Number(e.target.value) * MICRO_PAR_CORRECTION,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Ordre de grandeur : l&apos;enveloppe est comptée en dollars
                  ({(plan.aiBudgetMicroUsd / 1_000_000).toFixed(2)} $) et convertie ici au
                  coût <em>estimé</em> d&apos;une correction écrite. Une correction orale en
                  consomme 2 à 3.
                </p>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Inclus dans l&apos;offre</legend>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {capabilities.map((cap) => (
                    <label key={cap} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={plan.capabilities.includes(cap)}
                        onChange={(e) =>
                          patch(plan.slug, {
                            capabilities: e.target.checked
                              ? [...plan.capabilities, cap]
                              : plan.capabilities.filter((c) => c !== cap),
                          })
                        }
                      />
                      {LABELS[cap] ?? cap}
                    </label>
                  ))}
                </div>
              </fieldset>

              <Button type="submit" disabled={!coreAvailable}>
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}

      {plans.length === 0 && coreAvailable ? (
        <p className="text-sm text-muted-foreground">
          Aucune offre au catalogue. Lancez le seed :{" "}
          <code>pnpm --filter @kebrane/core seed</code>
        </p>
      ) : null}
    </main>
  );
}

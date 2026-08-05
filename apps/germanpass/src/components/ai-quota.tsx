import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { correctionsIncluses } from "@/lib/pricing";
import type { Entitlement } from "@kebrane/core";

/**
 * Enveloppe de corrections restante, et paywall à l'épuisement (KB-13).
 *
 * Un même composant pour les deux états, à dessein : le membre doit voir fondre
 * son enveloppe AVANT de buter dessus. Un paywall qui surgit sans prévenir est
 * vécu comme un piège ; un compteur visible depuis le début est une information.
 *
 * Le nombre affiché est un ORDRE DE GRANDEUR — il divise une enveloppe en
 * dollars par le coût estimé d'une correction (voir `lib/kebrane.ts`). D'où le
 * « ~ » : promettre un compte exact qu'on ne tiendrait pas serait pire que
 * d'annoncer une approximation.
 */
export function AiQuota({ entitlement }: { entitlement: Entitlement | null }) {
  // Core sans avis (pont désactivé, base indisponible) : on n'affiche rien
  // plutôt qu'un compteur faux.
  if (!entitlement) return null;

  const restantes = correctionsIncluses(entitlement.aiRemainingMicroUsd);
  const incluses = correctionsIncluses(entitlement.aiBudgetMicroUsd);
  const epuise = entitlement.aiRemainingMicroUsd <= 0;

  if (epuise) {
    return (
      <Card className="border-accent/40 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-lg">Corrections épuisées</CardTitle>
          <CardDescription>
            {entitlement.paid
              ? "Vous avez utilisé toutes les corrections de votre formule. Elles seront rechargées à votre prochain renouvellement."
              : "Vous avez utilisé votre correction offerte. Les cours et les examens blancs restent accessibles sans limite."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
            {entitlement.paid ? "Renouveler" : "Voir les formules"}
          </Link>
          <span className="text-sm text-muted-foreground">
            Vous pouvez continuer à vous entraîner : seule la correction automatique est
            suspendue.
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Corrections automatiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold text-primary">
          ~{restantes}
          {incluses > 0 ? (
            <span className="text-base font-normal text-muted-foreground"> / {incluses}</span>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground">
          {entitlement.paid
            ? "Incluses dans votre formule en cours."
            : "Correction offerte — les cours et examens blancs restent illimités."}
        </p>
        {entitlement.expiresAt ? (
          <p className="text-xs text-muted-foreground">
            Accès valable jusqu&apos;au{" "}
            {entitlement.expiresAt.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

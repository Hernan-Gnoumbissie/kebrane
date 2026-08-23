"use client";

import { useActionState } from "react";
import { Button, formatDuree, formatEquivalentEur, formatMontant } from "@kebrane/ui";
import { modifierOffre, type EtatFormulaire } from "./actions";

export interface OffreModifiable {
  productSlug: string;
  slug: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationDays: number;
  capabilities: string[];
  aiBudgetMicroUsd: number;
  sortOrder: number;
  active: boolean;
}

const ETAT_INITIAL: EtatFormulaire = {};

const CHAMP =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function Champ({
  id,
  label,
  aide,
  children,
}: {
  id: string;
  label: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {aide ? <p className="text-xs text-muted-foreground">{aide}</p> : null}
    </div>
  );
}

/**
 * Formulaire d'édition d'une offre (KB-34).
 *
 * Un formulaire par offre plutôt qu'un écran d'édition séparé : la grille se
 * relit d'un coup d'œil et se corrige sur place. Chaque enregistrement est
 * indépendant — modifier l'Intensif ne réécrit pas la Découverte, et n'ouvre
 * donc pas la porte à un écrasement concurrent silencieux.
 *
 * Les montants s'éditent en **plus petite unité de la devise**, telle qu'elle
 * est stockée. On affiche à côté le rendu réel : c'est le seul moyen de voir
 * qu'on vient de taper 80 000 au lieu de 8 000.
 */
export function OffreForm({
  offre,
  capacitesDisponibles,
}: {
  offre: OffreModifiable;
  capacitesDisponibles: { cle: string; label: string }[];
}) {
  const [etat, action, enCours] = useActionState(modifierOffre, ETAT_INITIAL);

  return (
    <form action={action} className="rounded-lg border border-border bg-card p-5">
      <input type="hidden" name="productSlug" value={offre.productSlug} />
      <input type="hidden" name="planSlug" value={offre.slug} />

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold text-primary">
          {offre.name}{" "}
          <code className="font-sans text-xs font-normal text-muted-foreground">
            {offre.slug}
          </code>
        </h3>
        <p className="text-sm text-muted-foreground">
          Actuellement : {formatMontant(offre.priceAmount, offre.currency)} ·{" "}
          {formatDuree(offre.durationDays)}
          {offre.active ? "" : " · désactivée"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Champ id={`${offre.slug}-name`} label="Nom">
          <input
            id={`${offre.slug}-name`}
            name="name"
            defaultValue={offre.name}
            required
            className={CHAMP}
          />
        </Champ>

        <Champ id={`${offre.slug}-sortOrder`} label="Ordre d'affichage">
          <input
            id={`${offre.slug}-sortOrder`}
            name="sortOrder"
            type="number"
            step={1}
            defaultValue={offre.sortOrder}
            className={CHAMP}
          />
        </Champ>

        <Champ
          id={`${offre.slug}-priceAmount`}
          label="Prix"
          // L'équivalent euro est rappelé ici parce que la page publique
          // l'affiche : l'administrateur doit voir ce que le client voit.
          aide={`En plus petite unité de la devise — affiché ${formatMontant(
            offre.priceAmount,
            offre.currency
          )}${
            formatEquivalentEur(offre.priceAmount, offre.currency)
              ? `, soit environ ${formatEquivalentEur(offre.priceAmount, offre.currency)}`
              : ""
          }.`}
        >
          <input
            id={`${offre.slug}-priceAmount`}
            name="priceAmount"
            type="number"
            min={0}
            step={1}
            defaultValue={offre.priceAmount}
            className={CHAMP}
          />
        </Champ>

        <Champ id={`${offre.slug}-currency`} label="Devise" aide="Code ISO à trois lettres.">
          <input
            id={`${offre.slug}-currency`}
            name="currency"
            defaultValue={offre.currency}
            maxLength={3}
            className={CHAMP}
          />
        </Champ>

        <Champ
          id={`${offre.slug}-durationDays`}
          label="Durée (jours)"
          aide={`Soit ${formatDuree(offre.durationDays)} d'accès.`}
        >
          <input
            id={`${offre.slug}-durationDays`}
            name="durationDays"
            type="number"
            min={1}
            step={1}
            defaultValue={offre.durationDays}
            className={CHAMP}
          />
        </Champ>

        <Champ
          id={`${offre.slug}-aiBudgetMicroUsd`}
          label="Enveloppe IA (micro-dollars)"
          aide="1 000 000 = 1 $. Une correction écrite coûte environ 20 000."
        >
          <input
            id={`${offre.slug}-aiBudgetMicroUsd`}
            name="aiBudgetMicroUsd"
            type="number"
            min={0}
            step={1}
            defaultValue={offre.aiBudgetMicroUsd}
            className={CHAMP}
          />
        </Champ>

        <div className="sm:col-span-2">
          <Champ id={`${offre.slug}-description`} label="Description">
            <input
              id={`${offre.slug}-description`}
              name="description"
              defaultValue={offre.description ?? ""}
              className={CHAMP}
            />
          </Champ>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Capacités incluses</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {capacitesDisponibles.map((capacite) => (
            <label key={capacite.cle} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="capabilities"
                value={capacite.cle}
                defaultChecked={offre.capabilities.includes(capacite.cle)}
                className="h-4 w-4 rounded border-input"
              />
              {capacite.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={offre.active}
          className="h-4 w-4 rounded border-input"
        />
        Offre en vente
      </label>

      {etat.erreur ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {etat.erreur}
        </p>
      ) : null}
      {etat.succes ? (
        <p role="status" className="mt-4 text-sm text-success">
          {etat.succes}
        </p>
      ) : null}

      <div className="mt-5">
        <Button type="submit" size="sm" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

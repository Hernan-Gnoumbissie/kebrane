"use client";

import { useState, useTransition } from "react";
import { Button } from "@kebrane/ui";
import { supprimerMonCompte } from "./actions";

/** Mot à recopier pour confirmer. Volontairement explicite et en majuscules. */
const CONFIRMATION = "SUPPRIMER";

/**
 * Suppression du compte, en deux temps (KB-28).
 *
 * Une action irréversible ne se déclenche pas au premier clic. La confirmation
 * demande de RECOPIER un mot plutôt que de cliquer une seconde fois : un
 * double-clic malheureux ou un lecteur d'écran qui active deux boutons
 * successifs ne doit pas effacer un compte.
 *
 * Le récapitulatif de ce qui part et de ce qui reste est affiché AVANT la
 * confirmation : quelqu'un qui supprime son compte pour effacer ses traces doit
 * savoir que l'historique comptable, lui, est conservé anonymisé.
 */
export function SupprimerCompte() {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const confirme = saisie.trim().toUpperCase() === CONFIRMATION;

  function lancer() {
    setErreur(null);
    demarrer(async () => {
      const etat = await supprimerMonCompte();
      // En cas de succès l'action redirige : on n'arrive ici qu'en échec.
      if (etat?.erreur) setErreur(etat.erreur);
    });
  }

  if (!ouvert) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setOuvert(true)}>
        Supprimer mon compte
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Cette action est définitive.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Votre nom, votre adresse e-mail et votre identifiant de connexion sont effacés.</li>
          <li>Vos accès aux produits sont supprimés — y compris un abonnement en cours.</li>
          <li>
            Vos paiements sont <strong className="text-foreground">conservés anonymisés</strong> :
            c&apos;est une obligation comptable, et ils ne vous désignent plus.
          </li>
        </ul>
        <p>
          Pensez à <strong className="text-foreground">exporter vos données</strong> avant, si
          vous les voulez.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmation-suppression" className="block text-sm">
          Pour confirmer, saisissez <strong>{CONFIRMATION}</strong> :
        </label>
        <input
          id="confirmation-suppression"
          type="text"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          autoComplete="off"
          disabled={enCours}
          className="h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      {erreur ? (
        <p role="alert" className="text-sm text-destructive">
          {erreur}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={!confirme || enCours}
          onClick={lancer}
        >
          {enCours ? "Suppression…" : "Supprimer définitivement"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={enCours}
          onClick={() => {
            setOuvert(false);
            setSaisie("");
            setErreur(null);
          }}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}

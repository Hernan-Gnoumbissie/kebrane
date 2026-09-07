import { NextResponse } from "next/server";
import { getKebraneSession } from "@kebrane/auth/server";
import { privacy } from "@kebrane/core";

/**
 * Téléchargement de l'export RGPD (KB-28).
 *
 * Un gestionnaire de route plutôt qu'une action serveur : ce qu'on veut ici est
 * un FICHIER, et seule une réponse HTTP peut porter le `Content-Disposition`
 * qui déclenche l'enregistrement. Faire transiter le même JSON par une action
 * obligerait à le reconstruire en Blob côté navigateur pour un résultat
 * identique.
 *
 * La garde est refaite ICI et ne se repose pas sur le proxy : l'autorité, ce
 * sont les gardes serveur. Le proxy ne fait que la redirection de confort.
 */
export async function GET() {
  const session = await getKebraneSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
  }

  const contenu = await privacy.exportAccount(session.account.id);
  if (!contenu) {
    return NextResponse.json({ erreur: "Compte introuvable" }, { status: 404 });
  }

  const jour = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(contenu, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kebrane-mes-donnees-${jour}.json"`,
      // Des données personnelles n'ont rien à faire dans un cache, ni du
      // navigateur ni d'un intermédiaire.
      "Cache-Control": "no-store",
    },
  });
}

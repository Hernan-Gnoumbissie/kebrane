import { redirect } from "next/navigation";

/**
 * `/practice` n'est plus un écran : Lesen et Hören ont chacun le leur.
 *
 * On redirige au lieu de supprimer, parce que l'adresse existe dans des liens
 * déjà envoyés, dans les favoris des candidats et dans le service worker.
 * Casser une URL publiée pour une réorganisation interne serait leur faire
 * payer notre rangement.
 */
export default function PracticeIndexPage() {
  redirect("/practice/lesen");
}

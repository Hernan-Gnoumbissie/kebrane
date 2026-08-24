import { AppHeader } from "@/components/app-header";
import { LearnerSidebar } from "@/components/learner-sidebar";

/**
 * Gabarit de l'espace apprenant (UX-07, UX-11).
 *
 * Monté par les six layouts de la zone connectée, qui répétaient chacun
 * `<AppHeader />`. Les regrouper ici évite qu'ils divergent à la première
 * retouche.
 *
 * Disposition : en-tête en PLEINE LARGEUR au-dessus, barre latérale en dessous
 * à gauche. L'inverse — barre latérale sur toute la hauteur — aurait exigé un
 * logo lisible sur Marine, or `logo-germanpass.png` n'existe qu'en version
 * sombre. Cette disposition évite le problème et reste la plus courante.
 *
 * La barre ENVELOPPE le contenu : le décalage de la zone principale doit
 * suivre sa largeur, qui change quand on la replie.
 */
export function LearnerShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <LearnerSidebar>{children}</LearnerSidebar>
    </>
  );
}

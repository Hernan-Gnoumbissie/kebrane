import { auth } from "@/auth";
import { db } from "@/lib/db";
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
 * à gauche. L'inverse aurait exigé un logo lisible sur Marine, or
 * `logo-germanpass.png` n'existe qu'en version sombre.
 *
 * La barre ENVELOPPE le contenu : le décalage de la zone principale doit suivre
 * sa largeur, qui change quand on la replie.
 *
 * Les droits sont résolus ICI et non dans la barre, qui est un composant client
 * et n'a donc accès ni à la session ni à la base.
 */
export async function LearnerShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  let isAdmin = false;
  let examPrepOnly = false;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, plan: true },
    });
    isAdmin = user?.role === "ADMIN";
    examPrepOnly = !isAdmin && user?.plan === "EXAM_PREP";
  }

  return (
    <>
      <AppHeader />
      <LearnerSidebar droits={{ examPrepOnly }}>
        {children}
      </LearnerSidebar>
    </>
  );
}

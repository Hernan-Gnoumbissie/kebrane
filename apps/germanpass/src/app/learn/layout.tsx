import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { LearnerShell } from "@/components/learner-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActivePage } from "@/lib/active-gate";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  await requireActivePage();
  const session = await auth();
  let restricted = false;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, role: true },
    });
    restricted = user?.role !== "ADMIN" && user?.plan === "EXAM_PREP";
  }

  return (
    <LearnerShell>
      {restricted ? (
        <main className="container max-w-2xl py-10">
          <Card>
            <CardHeader>
              <CardTitle>Apprentissage — parcours complet requis</CardTitle>
              <CardDescription>
                Votre formule actuelle est « Préparation intensive examen » : elle couvre les
                entraînements Lesen/Hören/Schreiben/Sprechen et les examens blancs. Le curriculum
                (chapitres, leçons, flashcards) est réservé au parcours complet.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link href="/account" className={buttonVariants({ variant: "outline" })}>
                Mon compte
              </Link>
              <Link href="/dashboard" className={buttonVariants()}>
                Retour au tableau de bord
              </Link>
            </CardContent>
          </Card>
        </main>
      ) : (
        children
      )}
    </LearnerShell>
  );
}

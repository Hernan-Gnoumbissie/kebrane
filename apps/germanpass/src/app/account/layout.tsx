import { AppHeader } from "@/components/app-header";
import { AiQuota } from "@/components/ai-quota";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getKebraneEntitlement } from "@/lib/kebrane";

/**
 * L'enveloppe de corrections est affichée ICI plutôt que dans la page : celle-ci
 * est un composant client, alors que le quota se lit côté serveur via Core.
 *
 * Elle est montrée en haut de « Mon compte » pour que le membre voie son solde
 * fondre AVANT de buter dessus — un paywall qui surgit sans prévenir est vécu
 * comme un piège (KB-13).
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  let entitlement = null;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { clerkUserId: true },
    });
    if (user) entitlement = await getKebraneEntitlement(user);
  }

  return (
    <>
      <AppHeader />
      {entitlement ? (
        <div className="container max-w-3xl pt-6">
          <AiQuota entitlement={entitlement} />
        </div>
      ) : null}
      {children}
    </>
  );
}

import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { MobileBackButton } from "@/components/mobile-back-button";
import { Logo } from "@/components/logo";
import { ByKebrane } from "@kebrane/ui";
import { KEBRANE_HUB_URL } from "@/lib/platform";

const NAV_ITEMS = [
  { href: "/dashboard",          label: "Tableau de bord"  },
  { href: "/practice",           label: "Lesen/Hören"      },
  { href: "/practice/schreiben", label: "Schreiben"        },
  { href: "/practice/sprechen",  label: "Sprechen"         },
  { href: "/exams",              label: "Examens blancs"   },
  { href: "/learn",              label: "Apprentissage"    },
] as const;

/** Header de navigation partagé par toutes les pages connectées.
 *  Server component : récupère session + rôle en BDD.
 *  Le menu mobile (état, animations) est délégué à MobileNav (client component). */
export async function AppHeader() {
  const session = await auth();
  let isAdmin    = false;
  let examPrepOnly = false;

  // Extrait le prénom (premier mot du name) pour l'affichage "Bonjour [Prénom]"
  const firstName = session?.user?.name?.split(" ")[0] ?? null;

  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true, plan: true },
    });
    isAdmin      = user?.role === "ADMIN";
    examPrepOnly = !isAdmin && user?.plan === "EXAM_PREP";
  }

  const nav = NAV_ITEMS.filter((item) => {
    if (item.href === "/learn" && examPrepOnly) return false;
    // L'admin a son propre espace « Administration » ; pas de tableau de bord étudiant.
    if (item.href === "/dashboard" && isAdmin) return false;
    return true;
  }) as { href: string; label: string }[];

  return (
    <>
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-h-14 items-center gap-1 py-1.5 px-3 sm:px-4">

        {/* ── Logo ── */}
        <Link href="/dashboard" className="mr-3 shrink-0" aria-label="GermanPass — accueil">
          <span className="hidden sm:block">
            <Logo size="md" />
          </span>
          <span className="sm:hidden">
            <Logo size="sm" />
          </span>
          {/* Rattachement à la maison (charte, KB-12). Discret et non cliquable :
              le lien vers le compte Kebrane vit déjà à droite du header. */}
          <span className="hidden md:block pl-0.5 leading-none">
            <ByKebrane className="text-[0.625rem]" />
          </span>
        </Link>

        {/* ── Navigation desktop ── */}
        {/* Plus de navigation horizontale. Il y avait TROIS navigations selon
            la largeur — burger, liens horizontaux, barre latérale — donc trois
            apparences pour une même application. Il n'en reste deux : la barre
            latérale à partir de `lg`, le menu burger en dessous, et le burger
            reprend exactement les mêmes sections. */}
        <span className="flex-1" />

        {/* ── Bonjour [Prénom] + actions desktop ── */}
        <div className="hidden md:flex items-center gap-2">
          {/* Retour au hub Kebrane — la session Clerk est partagée (KB-10),
              donc aucun re-login. Lien natif : origine différente de l'app. */}
          <a
            href={KEBRANE_HUB_URL}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Compte Kebrane
          </a>
          <Link
            href="/account"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Mon compte
          </Link>
          {isAdmin ? (
            <Link href="/admin" className={buttonVariants({ size: "sm" })}>
              Administration
            </Link>
          ) : null}
        </div>

        {/* ── Menu burger mobile ── */}
        <MobileNav nav={nav} isAdmin={isAdmin} firstName={firstName} />
      </div>
    </header>

    {/* ── Bande « Retour » sous la nav, sur tous les écrans ── */}
    <MobileBackButton />
    </>
  );
}

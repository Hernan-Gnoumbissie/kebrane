"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bouton de déconnexion — barre latérale et menu mobile.
 *
 * **Plus en Rouge.** Il l'était (`text-destructive`), ce qui en faisait le seul
 * élément coloré de l'en-tête : l'œil y allait en premier, pour une action de
 * routine. La charte réserve le Rouge à ce qui est rare et grave, et se
 * déconnecter n'est ni l'un ni l'autre.
 *
 * `surFondSombre` l'adapte au Marine de la barre latérale ; `compact` le réduit
 * à son icône quand la barre est repliée.
 */
export function LogoutButton({
  compact = false,
  surFondSombre = false,
}: {
  compact?: boolean;
  surFondSombre?: boolean;
}) {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectUrl: "/" })}
      aria-label="Se déconnecter"
      title={compact ? "Se déconnecter" : undefined}
      className={cn(
        "flex w-full items-center rounded-lg py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        compact ? "justify-center px-0" : "gap-3 px-3",
        surFondSombre
          ? "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-primary-foreground/70 focus-visible:ring-offset-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring"
      )}
    >
      <LogOut aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
      {compact ? null : <span>Déconnexion</span>}
    </button>
  );
}

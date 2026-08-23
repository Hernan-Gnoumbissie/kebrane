"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Bouton de déconnexion (header + menu mobile). */
export function LogoutButton() {
  const { signOut } = useClerk();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ redirectUrl: "/" })}
      aria-label="Se déconnecter"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Déconnexion
    </Button>
  );
}

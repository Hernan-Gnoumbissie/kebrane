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
      className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Déconnexion
    </Button>
  );
}

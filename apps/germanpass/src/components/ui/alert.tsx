"use client";

import { cn } from "@/lib/utils";

/**
 * Message contextuel affiché dans le flux de la page.
 * Remplace les popups bloquantes : l'utilisateur garde son contexte et ses
 * données saisies. Icône + texte — jamais la couleur seule.
 */
export function Alert({
  variant = "error",
  className,
  children,
}: {
  variant?: "error" | "success" | "info";
  className?: string;
  children: React.ReactNode;
}) {
  const styles = {
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    success:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    info: "border-border bg-muted text-foreground",
  }[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3.5 py-2.5 text-sm",
        styles,
        className,
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      >
        {variant === "success" ? (
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm3.1 4.9-3.8 4.2a.75.75 0 0 1-1.1.02L4.4 8.8a.75.75 0 1 1 1.06-1.06l1.24 1.24 3.28-3.6a.75.75 0 1 1 1.12 1Z" />
        ) : (
          <path d="M8 1.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5Zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.5Zm0 6a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z" />
        )}
      </svg>
      <span>{children}</span>
    </div>
  );
}

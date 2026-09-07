import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Message contextuel affiché dans le flux de la page.
 *
 * Remplace les popups bloquantes : l'utilisateur garde son contexte et ses
 * données saisies. **Icône + texte — jamais la couleur seule** : un daltonien
 * ou un écran en plein soleil ne distinguent pas un fond vert d'un fond ambre.
 *
 * Les quatre variantes tirent leurs couleurs des TOKENS SÉMANTIQUES de la
 * charte (`--success`, `--warning`, `--info`, `--destructive`), servis par
 * `@kebrane/ui/styles.css`. Auparavant `success` était codé en `emerald-500`,
 * une couleur qui n'appartient pas à la charte et qui ne suivait pas le mode
 * sombre — c'est précisément ce que QW-2 corrige.
 *
 * Pas de `"use client"` : ce composant n'a aucun état. Sans la directive, il
 * s'utilise aussi bien depuis un composant serveur que client.
 */
type Variante = "info" | "success" | "warning" | "error";

const STYLES: Record<Variante, { classe: string; Icone: LucideIcon }> = {
  info: { classe: "border-info/30 bg-info/10 text-foreground", Icone: Info },
  success: { classe: "border-success/30 bg-success/10 text-foreground", Icone: CheckCircle2 },
  warning: { classe: "border-warning/40 bg-warning/10 text-foreground", Icone: AlertTriangle },
  error: { classe: "border-destructive/30 bg-destructive/10 text-destructive", Icone: AlertCircle },
};

export function Alert({
  variant = "error",
  titre,
  className,
  children,
}: {
  variant?: Variante;
  /** Intitulé court en gras. Optionnel : un message d'une ligne s'en passe. */
  titre?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { classe, Icone } = STYLES[variant];

  return (
    <div
      // `alert` interrompt le lecteur d'écran, `status` attend une pause. On ne
      // réserve l'interruption qu'à ce qui est vraiment une erreur.
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-sm",
        classe,
        className
      )}
    >
      <Icone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {titre ? <p className="font-semibold">{titre}</p> : null}
        <div className={cn(titre && "mt-1")}>{children}</div>
      </div>
    </div>
  );
}

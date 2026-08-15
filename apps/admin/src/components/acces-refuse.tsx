import { Card, CardHeader, CardTitle, CardDescription, KebraneLogo } from "@kebrane/ui";
import type { StaffDenial } from "@kebrane/auth/server";

/**
 * Écran de refus (KB-15).
 *
 * Il DIT ce qui manque au lieu d'afficher un 403 opaque. Un membre du personnel
 * qui a le bon rôle mais pas la double authentification doit comprendre qu'il
 * lui reste une action à faire — sinon il conclut à une panne et appelle.
 *
 * Aucune information sensible n'est divulguée : ces messages ne s'affichent
 * qu'à quelqu'un de déjà authentifié.
 */
const MESSAGES: Record<StaffDenial, { titre: string; detail: string; action?: string }> = {
  UNAUTHENTICATED: {
    titre: "Session expirée",
    detail: "Reconnectez-vous pour accéder à l'administration.",
  },
  FORBIDDEN: {
    titre: "Accès réservé au personnel",
    detail:
      "Votre compte Kebrane n'a pas le rôle requis. Un administrateur peut vous l'accorder.",
    action: "pnpm --filter @kebrane/core grant-admin <email> STAFF",
  },
  MFA_REQUIRED: {
    titre: "Double authentification requise",
    detail:
      "L'administration exige une seconde étape de vérification. Activez-la depuis votre compte Kebrane, puis revenez — vous avez déjà le rôle nécessaire.",
  },
};

export function AccesRefuse({ denial, email }: { denial: StaffDenial; email?: string }) {
  const m = MESSAGES[denial];
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <div className="mb-6">
        <KebraneLogo />
      </div>
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>{m.titre}</CardTitle>
          <CardDescription>{m.detail}</CardDescription>
          {email ? (
            <p className="text-sm text-muted-foreground">
              Compte concerné : <strong>{email}</strong>
            </p>
          ) : null}
          {m.action ? (
            <code className="block rounded bg-muted px-3 py-2 text-xs">{m.action}</code>
          ) : null}
        </CardHeader>
      </Card>
    </div>
  );
}

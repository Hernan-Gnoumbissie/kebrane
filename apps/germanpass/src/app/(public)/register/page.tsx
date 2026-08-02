import { SignUp } from "@clerk/nextjs";

/**
 * Inscription — flux Clerk. La création du compte déclenche le webhook
 * `user.created` qui crée l'utilisateur métier en base au statut PENDING
 * (validation admin conservée) et planifie la séquence marketing.
 * `routing="hash"` conserve le chemin /register sans route catch-all.
 */
export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignUp routing="hash" signInUrl="/login" fallbackRedirectUrl="/dashboard" />
    </main>
  );
}

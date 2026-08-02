import { SignIn } from "@clerk/nextjs";

/**
 * Connexion — flux Clerk (mot de passe + Google, configurés côté dashboard Clerk).
 * Remplace l'ancien écran next-auth : reset, anti-énumération et MFA natifs.
 * `routing="hash"` conserve le chemin /login sans route catch-all.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignIn routing="hash" signUpUrl="/register" fallbackRedirectUrl="/dashboard" />
    </main>
  );
}

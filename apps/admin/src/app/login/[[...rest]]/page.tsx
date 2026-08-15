import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Connexion" };

/**
 * Pas de lien d'inscription : on ne devient pas membre du personnel en
 * s'inscrivant. Le rôle s'accorde depuis Core (`grant-admin`), et la double
 * authentification est exigée ensuite par la garde serveur.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignIn fallbackRedirectUrl="/" />
    </main>
  );
}

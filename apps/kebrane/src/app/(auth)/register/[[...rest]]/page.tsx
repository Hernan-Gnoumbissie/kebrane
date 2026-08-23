import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Créer un compte" };

/**
 * Inscription.
 *
 * ⚠ Le consentement CGU + confidentialité (KB-27) n'est PAS codé ici : il est
 * activé dans le tableau de bord Clerk (« Legal acceptance »), ce qui ajoute la
 * case au composant `<SignUp>` ci-dessous et **horodate** l'acceptation côté
 * Clerk. Une case maison, elle, n'aurait aucune valeur probante — voir
 * `docs/CLERK-LEGAL-ACCEPTANCE.md`.
 */
export default function RegisterPage() {
  return <SignUp signInUrl="/login" fallbackRedirectUrl="/hub" />;
}

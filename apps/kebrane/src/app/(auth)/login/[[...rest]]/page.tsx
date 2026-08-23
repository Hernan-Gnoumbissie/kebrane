import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Se connecter" };

// La mise en page (logo, lien d'évitement, rappel légal) vit dans `(auth)/layout.tsx`.
export default function LoginPage() {
  return <SignIn signUpUrl="/register" fallbackRedirectUrl="/hub" />;
}

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ALLOWED_REDIRECT_ORIGINS, KEBRANE_HUB_URL } from "@/lib/platform";
import "@kebrane/ui/styles.css";
import "./globals.css";

const DESCRIPTION =
  "La maison edtech Kebrane : une seule identité pour préparer vos examens, " +
  "apprendre et progresser. GermanPass, TCF Canada, Permis Cameroun.";

export const metadata: Metadata = {
  // `metadataBase` est indispensable : sans lui, Next émet les URL d'images
  // sociales en RELATIF, et aucune plateforme de partage ne sait les résoudre.
  metadataBase: new URL(KEBRANE_HUB_URL),
  title: { default: "Kebrane — un compte, tous les produits", template: "%s · Kebrane" },
  description: DESCRIPTION,
  applicationName: "Kebrane",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Kebrane",
    title: "Kebrane — un compte, tous les produits",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kebrane — un compte, tous les produits",
    description: DESCRIPTION,
  },
  // Le hub et les écrans d'authentification sont exclus par `robots.ts` ; la
  // vitrine, elle, est ouverte.
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `allowedRedirectOrigins` : autorise le va-et-vient hub <-> produits sans
    // re-login (KB-10). Sans lui, Clerk refuse la redirection cross-origine.
    <ClerkProvider allowedRedirectOrigins={ALLOWED_REDIRECT_ORIGINS}>
      <html lang="fr" suppressHydrationWarning>
        <body className="min-h-screen">
          {/* Lien d'évitement (KB-16) : invisible tant qu'on ne l'atteint pas au
              clavier. Sans lui, la navigation au clavier impose de traverser
              tout l'en-tête à chaque page. */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Aller au contenu
          </a>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

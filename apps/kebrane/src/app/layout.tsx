import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ALLOWED_REDIRECT_ORIGINS } from "@/lib/platform";
import "@kebrane/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kebrane", template: "%s · Kebrane" },
  description: "Un compte Kebrane, tous les produits.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `allowedRedirectOrigins` : autorise le va-et-vient hub <-> produits sans
    // re-login (KB-10). Sans lui, Clerk refuse la redirection cross-origine.
    <ClerkProvider allowedRedirectOrigins={ALLOWED_REDIRECT_ORIGINS}>
      <html lang="fr" suppressHydrationWarning>
        <body className="min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  );
}

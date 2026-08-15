import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ALLOWED_REDIRECT_ORIGINS } from "@/lib/platform";
import "@kebrane/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Administration Kebrane", template: "%s · Administration Kebrane" },
  description: "Console d'administration de la plateforme Kebrane.",
  // Une console d'administration n'a rien à faire dans un index.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider allowedRedirectOrigins={ALLOWED_REDIRECT_ORIGINS}>
      <html lang="fr" suppressHydrationWarning>
        <body className="min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  );
}

import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ALLOWED_REDIRECT_ORIGINS, CLERK_SATELLITE } from "@/lib/platform";
// Tokens de la maison AVANT la feuille de l'app (KB-12) : l'ordre des imports
// fixe l'ordre dans la cascade, et c'est ainsi que l'accent produit défini dans
// globals.css l'emporte sur l'accent par défaut de la charte.
import "@kebrane/ui/styles.css";
import "./globals.css";
import { Toaster } from "@/components/toaster";
import { OfflineProvider } from "@/components/offline-provider";
import { OfflineBanner } from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: {
    default: "GermanPass",
    template: "%s | GermanPass",
  },
  description:
    "Plateforme d'apprentissage de l'allemand et de simulation d'examens Goethe-Zertifikat, ÖSD, TELC et ECL (A1–C2). Plattform nicht mit Goethe-Institut, ÖSD, telc gGmbH oder ECL verbunden.",
  manifest: "/manifest.json",
  // iOS Safari : icône écran d'accueil
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GermanPass",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `allowedRedirectOrigins` : autorise le va-et-vient produit <-> hub Kebrane
    // sans re-login (KB-10). `CLERK_SATELLITE` est vide en topologie
    // sous-domaines (cas retenu) et ne s'active que par env.
    <ClerkProvider allowedRedirectOrigins={ALLOWED_REDIRECT_ORIGINS} {...CLERK_SATELLITE}>
      <html lang="fr" suppressHydrationWarning>
        <body className="min-h-screen antialiased" suppressHydrationWarning>
          <OfflineProvider>
            <OfflineBanner />
            {children}
          </OfflineProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

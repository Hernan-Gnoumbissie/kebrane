import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Proxy (Next.js 16 — ex middleware.ts) adossé à Clerk.
 *
 * Rôle : rediriger vers /login les visiteurs non authentifiés sur les zones
 * protégées. L'AUTORITÉ reste les guards serveur (requireStudent / requireAdmin),
 * qui revalident le statut EN BASE à chaque requête (ADR-004).
 *
 * ⚠ On n'utilise PAS `auth.protect()` : bug connu sous Next 16 (redirige vers
 * l'URL courante au lieu de la page de connexion). Redirection faite à la main.
 * Le webhook Clerk (/api/webhooks/clerk) n'est pas protégé : aucune règle ne le vise.
 */
const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/learn(.*)",
  "/practice(.*)",
  "/exam(.*)",
  "/exams(.*)",
  "/account(.*)",
  "/progress(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    const { userId } = await auth();
    if (!userId) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect_url", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Toutes les routes sauf statiques / internals Next / assets avec extension.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons|.*\\..*).*)",
    // Inclure explicitement les routes API/TRPC.
    "/(api|trpc)(.*)",
  ],
};

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Proxy de l'administration (KB-15).
 *
 * Contrairement au hub, **tout** est protégé sauf la connexion : une console
 * d'administration n'a pas de partie publique. L'autorité reste la garde
 * serveur `checkStaff()`, qui vérifie le rôle ET la double authentification —
 * ici on évite seulement d'afficher une page à un visiteur non connecté.
 */
const isPublic = createRouteMatcher(["/login(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return NextResponse.next();

  const { userId } = await auth();
  if (!userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};

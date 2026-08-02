import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Proxy (Next 16) adossé à Clerk. Autorité = gardes serveur (getKebraneSession).
// On ne fait qu'une redirection vers /login sur les zones connectées.
// Le webhook Clerk (/api/webhooks/clerk, KB-17) doit rester PUBLIC : aucune
// règle ne le vise, il s'authentifie par sa signature (verifyWebhook).
const isProtected = createRouteMatcher(["/hub(.*)"]);

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};

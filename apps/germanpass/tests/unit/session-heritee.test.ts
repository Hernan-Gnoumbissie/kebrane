import { test } from "node:test";
import assert from "node:assert/strict";
import { estIdentifiantSessionClerk } from "@/lib/session-format";

/**
 * KB-39 — regression.
 *
 * Le controle anti-partage de `requireUser()` comparait `activeSessionId` a
 * l'identifiant de session Clerk. Les comptes migres depuis next-auth portaient
 * encore un UUID : la comparaison etait TOUJOURS vraie, donc 401 a chaque
 * requete gardee, et tout l'espace d'administration devenait inaccessible.
 *
 * Le symptome ne ressemblait pas a une erreur — /admin renvoyait vers /login,
 * ou Clerk voyait une session valide et renvoyait vers /dashboard. La page
 * semblait simplement « retomber sur le tableau de bord ».
 *
 * Ces tests fixent la seule chose qui distingue les deux formats.
 */

test("un identifiant Clerk est reconnu", () => {
  assert.equal(estIdentifiantSessionClerk("sess_2abcDEF123"), true);
});

test("un UUID herite de next-auth est REJETE", () => {
  // La valeur exacte trouvee en base le 24 aout 2026.
  assert.equal(estIdentifiantSessionClerk("ab140c09-2b8b-4a00-af51-806dad78db84"), false);
});

test("une chaine vide n'est pas un identifiant de session", () => {
  assert.equal(estIdentifiantSessionClerk(""), false);
});

test("le prefixe doit etre en debut de chaine, pas n'importe ou", () => {
  assert.equal(estIdentifiantSessionClerk("x-sess_2abc"), false);
});

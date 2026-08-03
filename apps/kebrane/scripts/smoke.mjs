// Smoke du hub Kebrane (KB-18) — lance le serveur de PRODUCTION et vérifie que
// les trois portes d'entrée répondent comme prévu. Ce n'est pas un test unitaire :
// c'est le garde-fou qui attrape ce qu'aucun test unitaire ne voit — un proxy
// mal câblé, une CSP qui casse le rendu, une route qui disparaît du build.
//
// Prérequis : `next build` déjà passé (turbo s'en charge via `dependsOn`).
// Aucune base n'est requise : la landing a un repli (KB-19) et la redirection
// du hub est prononcée par le proxy, avant toute lecture.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = process.env.SMOKE_PORT ?? "3101";
const BASE = `http://127.0.0.1:${PORT}`;
const BOOT_TIMEOUT_MS = 90_000;

let failures = 0;
function check(label, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
}

const server = spawn("pnpm", ["exec", "next", "start", "-p", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: true, // groupe de processus : permet de tuer aussi les workers Next
});

let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

function stopServer() {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* déjà mort */
  }
}

async function waitForBoot() {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`le serveur s'est arrêté seul (code ${server.exitCode})\n${serverLog}`);
    }
    try {
      await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`serveur injoignable après ${BOOT_TIMEOUT_MS / 1000}s\n${serverLog}`);
}

try {
  await waitForBoot();

  // 1. Vitrine publique.
  const landing = await fetch(BASE);
  check("landing répond 200", landing.status === 200, `HTTP ${landing.status}`);
  const html = await landing.text();
  check("landing rend bien la page (et pas une erreur)", html.includes("Un compte Kebrane"));

  // 2. La feuille de style est SERVIE et porte les jetons de la charte.
  //
  // Ajouté après KB-12, où une application entièrement dépourvue de style a
  // traversé un build vert et 133 tests verts : rien dans la chaîne ne regarde
  // le CSS compilé. Un `@import` mal placé suffit à faire rejeter la feuille
  // entière, et le seul symptôme est visuel. Chercher le Marine de la charte
  // dans le CSS réellement servi ferme ce trou pour quelques millisecondes.
  const cssHref = html.match(/\/_next\/static\/[^"']+\.css/)?.[0];
  check("une feuille de style est référencée par la page", Boolean(cssHref), cssHref ?? "aucune");
  if (cssHref) {
    const css = await (await fetch(`${BASE}${cssHref}`)).text();
    check("la feuille porte le Marine de la charte", css.includes("216 45% 22%"));
    check("…et n'a pas gardé la palette shadcn par défaut", !css.includes("221.2 83.2% 53.3%"));
  }

  // 3. Zone connectée : le proxy doit rediriger AVANT tout rendu.
  const hub = await fetch(`${BASE}/hub`, { redirect: "manual" });
  check("/hub non connecté redirige (307)", hub.status === 307, `HTTP ${hub.status}`);
  check(
    "…et redirige vers /login",
    (hub.headers.get("location") ?? "").includes("/login"),
    hub.headers.get("location") ?? "aucun Location"
  );

  // 4. Webhook Clerk (KB-17) : public, mais fermé à toute requête non signée.
  const webhook = await fetch(`${BASE}/api/webhooks/clerk`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "user.created", data: { id: "user_smoke" } }),
  });
  check(
    "webhook Clerk rejette une requête non signée (400)",
    webhook.status === 400,
    `HTTP ${webhook.status}`
  );
} catch (e) {
  failures++;
  console.error(" FAIL  smoke interrompu :", e.message);
} finally {
  stopServer();
}

console.log(`\n${failures === 0 ? "SMOKE VERT" : `${failures} ÉCHEC(S)`}`);
process.exit(failures === 0 ? 0 : 1);

// Smoke de GermanPass (KB-12) — démarre le serveur de PRODUCTION et vérifie
// que les pages publiques répondent ET qu'elles sont réellement STYLÉES.
//
// Pourquoi cette dernière assertion existe : lors de KB-12, la bascule vers le
// design system a livré une application entièrement dépourvue de style — page
// en Times New Roman, pas une couleur — et elle a traversé un build vert et 133
// tests verts sans qu'aucun ne bronche. Rien, dans typecheck/lint/test, ne
// regarde le CSS compilé ; un `@import` mal placé suffit à faire rejeter la
// feuille entière, et le seul symptôme est visuel. Ce fichier ferme ce trou.
//
// Prérequis : `next build` déjà passé (turbo s'en charge via `dependsOn`).
// Aucune base n'est requise : seules des pages publiques sont sollicitées.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = process.env.SMOKE_PORT ?? "3102";
const BASE = `http://127.0.0.1:${PORT}`;
const BOOT_TIMEOUT_MS = 120_000;

/** Jetons de la charte Kebrane attendus dans la feuille servie. */
const CHARTE = [
  ["Marine (primaire)", "216 45% 22%"],
  ["Papier (fond)", "40 43% 97%"],
];
/** Palette shadcn par défaut : sa présence signifierait que KB-12 a régressé. */
const SHADCN_PAR_DEFAUT = "221.2 83.2% 53.3%";

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
      await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(2000) });
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`serveur injoignable après ${BOOT_TIMEOUT_MS / 1000}s\n${serverLog}`);
}

try {
  await waitForBoot();

  // 1. Les pages publiques répondent.
  for (const path of ["/login", "/register", "/legal"]) {
    const res = await fetch(`${BASE}${path}`);
    check(`${path} répond 200`, res.status === 200, `HTTP ${res.status}`);
  }

  // 2. La page est réellement stylée aux couleurs de la maison.
  const html = await (await fetch(`${BASE}/login`)).text();
  const cssHref = html.match(/\/_next\/static\/[^"']+\.css/)?.[0];
  check("une feuille de style est référencée par la page", Boolean(cssHref), cssHref ?? "aucune");

  if (cssHref) {
    const css = await (await fetch(`${BASE}${cssHref}`)).text();
    check("la feuille n'est pas vide", css.length > 1000, `${css.length} octets`);
    for (const [nom, token] of CHARTE) {
      check(`la feuille porte le ${nom}`, css.includes(token), token);
    }
    check(
      "la palette shadcn par défaut a bien disparu",
      !css.includes(SHADCN_PAR_DEFAUT),
      SHADCN_PAR_DEFAUT
    );
  }
} catch (e) {
  failures++;
  console.error(" FAIL  smoke interrompu :", e.message);
} finally {
  stopServer();
}

console.log(`\n${failures === 0 ? "SMOKE VERT" : `${failures} ÉCHEC(S)`}`);
process.exit(failures === 0 ? 0 : 1);

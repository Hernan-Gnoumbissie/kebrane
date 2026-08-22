import { test, describe, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { accounts, events, EVENT_CATALOG, eventDefinition, Role } from "../src/index";
import {
  notifications,
  consoleChannel,
  setNotificationChannel,
  type NotificationMessage,
} from "../src/notifications";
import { db, tracker, testEmail, testClerkId } from "./helpers";

/**
 * KB-14 — catalogue d'événements et routage des notifications.
 *
 * Le catalogue n'a de valeur que s'il est EXHAUSTIF : un type émis mais absent
 * du catalogue ne serait ni routé ni documenté, et personne ne s'en
 * apercevrait. Le premier test ci-dessous est donc le plus important — il lit
 * le code source pour vérifier qu'aucun type ne s'est glissé hors catalogue.
 */

/** Canal d'essai : retient les messages au lieu de les envoyer. */
function canalEspion() {
  const envoyes: NotificationMessage[] = [];
  setNotificationChannel({
    name: "espion",
    async send(message) {
      envoyes.push(message);
    },
  });
  return envoyes;
}

describe("catalogue d'événements", () => {
  test("tout type émis par le code figure au catalogue", () => {
    // Invariant central : sans lui, le catalogue se périme silencieusement à la
    // première fonctionnalité ajoutée.
    const racine = join(import.meta.dirname, "..", "..", "..");
    const emis = new Set<string>();

    const explorer = (dossier: string) => {
      for (const entree of readdirSync(dossier, { withFileTypes: true })) {
        if (entree.name === "node_modules" || entree.name.startsWith(".")) continue;
        const chemin = join(dossier, entree.name);
        if (entree.isDirectory()) {
          explorer(chemin);
        } else if (/\.tsx?$/.test(entree.name)) {
          const source = readFileSync(chemin, "utf8");
          for (const m of source.matchAll(/type:\s*"([a-z_]+\.[a-z_]+)"/g)) {
            emis.add(m[1]!);
          }
        }
      }
    };
    for (const paquet of ["packages", "apps"]) explorer(join(racine, paquet));

    const absents = [...emis].filter((t) => !(t in EVENT_CATALOG));
    assert.deepEqual(
      absents,
      [],
      `Types émis mais absents du catalogue : ${absents.join(", ")}`
    );
  });

  test("chaque définition est cohérente", () => {
    for (const [type, def] of Object.entries(EVENT_CATALOG)) {
      assert.ok(def.label.length > 3, `${type} : libellé trop court`);
      assert.ok(
        ["INFO", "IMPORTANT", "ACTION_REQUIRED"].includes(def.severity),
        `${type} : gravité inconnue`
      );
      // Une erreur applicative ne doit jamais partir chez un membre.
      // (`as const` typant `notify` au plus étroit, on élargit pour comparer.)
      const destinataires: readonly string[] = def.notify;
      if (type === "app.error") {
        assert.equal(destinataires.includes("member"), false);
      }
    }
  });

  test("un type inconnu n'a pas de définition", () => {
    assert.equal(eventDefinition("truc.inexistant"), null);
  });
});

describe("gravité issue du catalogue", () => {
  const t = tracker();
  after(async () => {
    setNotificationChannel(consoleChannel);
    await t.cleanup();
  });
  beforeEach(() => canalEspion());

  test("la gravité vient du catalogue, pas de l'appelant", async () => {
    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("sev"),
      email: testEmail("sev"),
      name: "Ada",
    });
    t.account(account.id);

    // `payment.failed` est ACTION_REQUIRED au catalogue ; on n'en dit rien ici.
    await events.log({ type: "payment.failed", accountId: account.id });

    const evt = await db.event.findFirst({
      where: { accountId: account.id, type: "payment.failed" },
    });
    assert.equal(evt?.severity, "ACTION_REQUIRED");
  });

  test("un appelant peut affiner la gravité quand le contexte la change", async () => {
    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("sev2"),
      email: testEmail("sev2"),
      name: "Ada",
    });
    t.account(account.id);

    // `product_access.changed` est INFO par défaut, mais une ouverture d'accès
    // est plus notable qu'une fermeture — c'est l'exception assumée.
    await events.log({
      type: "product_access.changed",
      severity: "IMPORTANT",
      accountId: account.id,
    });

    const evt = await db.event.findFirst({
      where: { accountId: account.id, type: "product_access.changed" },
    });
    assert.equal(evt?.severity, "IMPORTANT");
  });
});

describe("routage des notifications", () => {
  const t = tracker();
  after(async () => {
    setNotificationChannel(consoleChannel);
    await t.cleanup();
  });

  test("un paiement confirmé écrit au membre", async () => {
    const envoyes = canalEspion();
    const email = testEmail("notif-member");
    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("notif-member"),
      email,
      name: "Ada",
    });
    t.account(account.id);

    await notifications.routeEvent({
      type: "payment.confirmed",
      severity: "IMPORTANT",
      accountId: account.id,
    });

    const pourLeMembre = envoyes.filter((m) => m.audience === "member");
    assert.equal(pourLeMembre.length, 1);
    assert.equal(pourLeMembre[0]!.to, email);
    assert.match(pourLeMembre[0]!.body, /Ada/);
  });

  test("un événement sans destinataire n'envoie rien", async () => {
    const envoyes = canalEspion();
    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("notif-muet"),
      email: testEmail("notif-muet"),
      name: "Ada",
    });
    t.account(account.id);

    // `account.created` : journal seulement.
    await notifications.routeEvent({
      type: "account.created",
      severity: "INFO",
      accountId: account.id,
    });

    assert.equal(envoyes.length, 0);
  });

  test("une erreur applicative n'écrit à personne", async () => {
    const envoyes = canalEspion();
    await notifications.routeEvent({ type: "app.error", severity: "ACTION_REQUIRED" });
    assert.equal(envoyes.length, 0, "une panne en cascade noierait les boîtes");
  });

  test("un changement de rôle prévient le PERSONNEL, pas l'intéressé", async () => {
    const envoyes = canalEspion();
    const emailMembre = testEmail("notif-role");
    const membre = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("notif-role"),
      email: emailMembre,
      name: "Ada",
    });
    t.account(membre.id);

    const emailStaff = testEmail("notif-staff");
    const staff = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("notif-staff"),
      email: emailStaff,
      name: "Le Staff",
    });
    t.account(staff.id);
    await accounts.setRole(staff.id, Role.STAFF, { source: "test" });

    envoyes.length = 0; // on ignore ce que la promotion elle-même a routé
    await notifications.routeEvent({
      type: "account.role_changed",
      severity: "IMPORTANT",
      accountId: membre.id,
    });

    const destinataires = envoyes.map((m) => m.to);
    assert.ok(
      destinataires.includes(emailStaff),
      "le personnel doit voir une élévation de privilège"
    );
    assert.equal(
      destinataires.includes(emailMembre),
      false,
      "l'intéressé n'est pas le bon témoin de sa propre promotion"
    );
  });

  test("un canal en panne ne fait pas échouer l'opération", async () => {
    // Exigence centrale : prévenir quelqu'un est un effet de bord. Si l'envoi
    // casse, le paiement ou la promotion qui vient d'aboutir reste acquis.
    setNotificationChannel({
      name: "cassé",
      async send() {
        throw new Error("SMTP indisponible");
      },
    });

    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("notif-panne"),
      email: testEmail("notif-panne"),
      name: "Ada",
    });
    t.account(account.id);

    await assert.doesNotReject(() =>
      notifications.routeEvent({
        type: "payment.confirmed",
        severity: "IMPORTANT",
        accountId: account.id,
      })
    );
  });
});

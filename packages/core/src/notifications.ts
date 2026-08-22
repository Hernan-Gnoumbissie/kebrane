// @kebrane/core — routage des notifications (KB-14).
//
// Même principe que `billing` : Core définit une INTERFACE et route ; il ne
// sait pas envoyer. L'application branche un canal concret (SMTP), et changer
// de fournisseur d'e-mail ne touche ni Core ni les produits.
//
// Par défaut, un canal qui journalise dans la console : sans lui, un
// environnement non configuré échouerait à chaque événement — et une
// notification manquée ne doit JAMAIS casser l'opération qui l'a déclenchée.
import { db } from "@kebrane/db";
import { Role } from "@kebrane/db";
import type { Audience, Severity } from "./events-catalog";
import { eventDefinition } from "./events-catalog";

export interface NotificationMessage {
  to: string;
  subject: string;
  /** Texte brut : lisible partout, et sans risque d'injection HTML. */
  body: string;
  eventType: string;
  severity: Severity;
  audience: Audience;
}

export interface NotificationChannel {
  readonly name: string;
  send(message: NotificationMessage): Promise<void>;
}

/**
 * Canal par défaut : écrit dans la console.
 *
 * Ce n'est pas un bouche-trou mais un choix : en développement et en CI, on
 * veut voir qu'une notification serait partie, sans configurer un serveur SMTP
 * ni risquer d'écrire à de vraies personnes depuis une base de test.
 */
export const consoleChannel: NotificationChannel = {
  name: "console",
  async send(message) {
    console.info(
      `[notification/${message.audience}] ${message.to} — ${message.subject} ` +
        `(${message.eventType}, ${message.severity})`
    );
  },
};

let channel: NotificationChannel = consoleChannel;

/** Branche le canal d'envoi réel (SMTP…). */
export function setNotificationChannel(next: NotificationChannel): void {
  channel = next;
}

export function getNotificationChannel(): NotificationChannel {
  return channel;
}

/** Rédige le message. Sobre à dessein : un e-mail transactionnel informe. */
function compose(input: {
  label: string;
  eventType: string;
  audience: Audience;
  accountName?: string;
}): { subject: string; body: string } {
  const subject =
    input.audience === "staff"
      ? `[Kebrane] ${input.label}`
      : `Kebrane — ${input.label}`;

  const salutation = input.accountName ? `Bonjour ${input.accountName},` : "Bonjour,";
  const body =
    input.audience === "staff"
      ? `${input.label}\n\nÉvénement : ${input.eventType}\n\n` +
        `Consultez la console d'administration pour le détail.`
      : `${salutation}\n\n${input.label}.\n\n` +
        `Si cette action ne vient pas de vous, répondez à ce message.\n\n` +
        `— L'équipe Kebrane`;

  return { subject, body };
}

export const notifications = {
  /**
   * Route un événement vers ses destinataires, selon le catalogue.
   *
   * **Ne lève jamais.** Une notification est un effet de bord : échouer à
   * prévenir quelqu'un ne doit pas annuler le paiement, la promotion ou
   * l'accès qui vient d'avoir lieu. Les échecs sont journalisés en console,
   * pas propagés.
   */
  async routeEvent(input: {
    type: string;
    severity: Severity;
    accountId?: string | null;
  }): Promise<void> {
    const definition = eventDefinition(input.type);
    if (!definition || definition.notify.length === 0) return;

    try {
      for (const audience of definition.notify) {
        const destinataires = await recipientsFor(audience, input.accountId ?? null);
        for (const { email, name } of destinataires) {
          const { subject, body } = compose({
            label: definition.label,
            eventType: input.type,
            audience,
            accountName: audience === "member" ? name : undefined,
          });
          await channel.send({
            to: email,
            subject,
            body,
            eventType: input.type,
            severity: input.severity,
            audience,
          });
        }
      }
    } catch (e) {
      console.warn(`[notifications] routage de ${input.type} échoué :`, e);
    }
  },
};

async function recipientsFor(
  audience: Audience,
  accountId: string | null
): Promise<{ email: string; name: string }[]> {
  if (audience === "member") {
    if (!accountId) return [];
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: { email: true, name: true },
    });
    return account ? [account] : [];
  }

  // Personnel : tous les comptes STAFF et ADMIN. Sur une petite équipe c'est
  // suffisant ; le jour où elle grandit, une liste de diffusion sera plus juste.
  const staff = await db.account.findMany({
    where: { role: { in: [Role.STAFF, Role.ADMIN] } },
    select: { email: true, name: true },
  });
  return staff;
}

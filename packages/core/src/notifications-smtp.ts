// @kebrane/core — canal SMTP (KB-14).
//
// Module SÉPARÉ du reste des notifications, et importé explicitement : il tire
// `nodemailer`, que ni les tests ni la CI n'ont besoin de charger. Le routage
// (`notifications.ts`) reste sans dépendance lourde.
//
// Usage, au démarrage d'une app :
//   import { smtpChannel } from "@kebrane/core/notifications-smtp";
//   import { setNotificationChannel } from "@kebrane/core";
//   const canal = smtpChannel();
//   if (canal) setNotificationChannel(canal);
import nodemailer from "nodemailer";
import type { NotificationChannel } from "./notifications";

/**
 * Construit le canal SMTP à partir de l'environnement, ou rend `null` s'il
 * n'est pas configuré.
 *
 * `null` plutôt qu'une erreur : un environnement sans SMTP doit fonctionner —
 * il retombe alors sur le canal console. Faire échouer le démarrage parce
 * qu'un e-mail ne peut pas partir serait disproportionné.
 */
export function smtpChannel(): NotificationChannel | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });

  const from = process.env.KEBRANE_SMTP_FROM ?? "Kebrane <no-reply@kebrane.com>";

  return {
    name: "smtp",
    async send(message) {
      await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.body,
      });
    },
  };
}

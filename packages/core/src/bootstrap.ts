// @kebrane/core — amorçage des services optionnels (KB-21).
//
// Appelé une fois au démarrage d'une app. Regroupe ici ce qui doit être branché
// avant la première requête, pour qu'une app n'ait pas à connaître le détail de
// chaque service — et surtout pour qu'aucune ne l'oublie.
import { setNotificationChannel } from "./notifications";

let fait = false;

/**
 * Branche le canal d'envoi réel si l'environnement le permet.
 *
 * Idempotent : un layout Next peut être évalué plusieurs fois selon le mode de
 * rendu, et rebrancher un transport SMTP à chaque appel ouvrirait des
 * connexions pour rien.
 *
 * Silencieux si `SMTP_HOST` est absent : on reste alors sur le canal console,
 * qui est le bon comportement en développement et en CI. Une plateforme sans
 * SMTP doit démarrer — refuser de le faire parce qu'un e-mail ne partira pas
 * serait disproportionné.
 */
export async function bootstrapKebrane(): Promise<void> {
  if (fait) return;
  fait = true;

  if (!process.env.SMTP_HOST) return;
  try {
    // Import dynamique : `nodemailer` n'est chargé que s'il sert réellement.
    const { smtpChannel } = await import("./notifications-smtp");
    const canal = smtpChannel();
    if (canal) {
      setNotificationChannel(canal);
      console.info("[kebrane] notifications : canal SMTP branché");
    }
  } catch (e) {
    // Un envoi d'e-mail impossible ne doit pas empêcher la plateforme de servir.
    console.warn("[kebrane] canal SMTP indisponible, on reste sur la console :", e);
  }
}

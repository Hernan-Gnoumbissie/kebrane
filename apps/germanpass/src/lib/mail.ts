import nodemailer from "nodemailer";
import { env } from "@/lib/env";

const transporter =
  env.SMTP_HOST && env.SMTP_USER
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      })
    : null;

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.warn(`[mail] SMTP non configuré — email "${subject}" vers ${to} non envoyé`);
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
}

const APP_URL = env.APP_URL;

const layout = (body: string): string =>
  `<!DOCTYPE html>
  <html lang="fr">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);padding:28px 40px;text-align:center">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">
                🇩🇪 GermanPass
              </h1>
              <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px">La plateforme n°1 de préparation aux examens d'allemand</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
              <p style="margin:0;font-size:11px;color:#94a3b8">
                GermanPass — plateforme indépendante, non affiliée au Goethe-Institut, ÖSD, telc gGmbH ou ECL.
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#94a3b8">
                <a href="${APP_URL}/unsubscribe" style="color:#94a3b8">Se désabonner</a>
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

const ctaButton = (text: string, href: string) =>
  `<p style="text-align:center;margin:28px 0">
    <a href="${href}"
       style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px">
      ${text}
    </a>
  </p>`;

const featureRow = (icon: string, title: string, desc: string) =>
  `<tr>
    <td style="padding:10px 0">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:44px;vertical-align:top;padding-top:2px;font-size:22px">${icon}</td>
          <td>
            <strong style="color:#1e293b;font-size:14px">${title}</strong>
            <p style="margin:2px 0 0;font-size:13px;color:#64748b">${desc}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

export const mailTemplates = {
  /**
   * Envoyé quand quelqu'un tente de s'inscrire avec une adresse déjà utilisée.
   *
   * La route d'inscription répond exactement la même chose que le compte
   * existe ou non (pas d'énumération de comptes). L'information ne peut donc
   * pas transiter par l'écran : elle passe par ce courrier, dans un canal que
   * seul le propriétaire légitime de l'adresse contrôle.
   *
   * Aucun lien de connexion automatique ni de jeton : uniquement des liens
   * publics. Un e-mail de ce type ne doit jamais donner d'accès par lui-même.
   */
  accountAlreadyExists: (name: string) => ({
    subject: "Vous avez déjà un compte GermanPass",
    html: layout(
      `<h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Bonjour ${name},</h2>
       <p style="color:#475569;font-size:15px;margin:0 0 20px">
         Une inscription vient d'être tentée avec cette adresse e-mail. Bonne
         nouvelle : vous avez <strong>déjà un compte</strong> chez nous — inutile
         d'en créer un second.
       </p>
       ${ctaButton("Me connecter →", `${APP_URL}/login`)}
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:20px">
         <p style="margin:0;font-size:14px;color:#475569">
           <strong>Mot de passe oublié ?</strong><br>
           <a href="${APP_URL}/forgot-password" style="color:#2563eb;font-weight:600">
             Choisir un nouveau mot de passe
           </a>
         </p>
       </div>
       <p style="font-size:13px;color:#64748b;margin:0">
         Vous n'êtes pas à l'origine de cette tentative ? Vous pouvez ignorer ce
         message : aucun compte n'a été créé et le vôtre n'a pas été modifié.
       </p>`
    ),
  }),

  /** E-mail de bienvenue riche envoyé immédiatement à l'inscription, avec trial 24 h. */
  welcomeWithTrial: (name: string, trialUntil: Date) => ({
    subject: "🎉 Bienvenue sur GermanPass — votre accès gratuit est actif !",
    html: layout(
      `<h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Bienvenue, ${name} !</h2>
       <p style="color:#475569;font-size:15px;margin:0 0 20px">
         Merci de rejoindre <strong>GermanPass</strong>, la plateforme complète pour
         réussir votre examen d'allemand (Goethe, ÖSD, telc, ECL).
       </p>
       <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:24px">
         <strong style="color:#1d4ed8">✅ Votre accès gratuit de 24 h est actif !</strong><br>
         <span style="font-size:13px;color:#3b82f6">Expire le ${trialUntil.toLocaleString("fr-FR")} — profitez-en maintenant.</span>
       </div>
       <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px">Tout ce que vous pouvez faire dès maintenant :</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
         ${featureRow("📚", "Apprendre (chapitres structurés)", "Chapitres organisés par niveau (A1→C2) et thème (grammaire, vocabulaire, Redemittel) avec exercices pratiques à valider à la fin de chaque session.")}
         ${featureRow("🃏", "Flashcards SRS", "Mémorisez le vocabulaire avec le système de répétition espacée (SM-2) : la carte suivante est programmée au moment optimal pour ancrer la connaissance en mémoire long terme.")}
         ${featureRow("📖", "Lesen (Lecture)", "Textes authentiques, QCM, vrai/faux, textes à trous par niveau A1→C2.")}
         ${featureRow("🎧", "Hören (Écoute)", "Audios variétés DE/AT/CH, écoutes limitées comme à l'examen réel.")}
         ${featureRow("✍️", "Schreiben (Écriture)", "Lettres, essais, posts de forum — corrigés par IA avec feedback détaillé.")}
         ${featureRow("🎙️", "Sprechen (Expression orale)", "Enregistrez votre oral, obtenez une transcription et des métriques de fluidité.")}
         ${featureRow("📝", "Examens blancs complets", "Simulez un examen Goethe/ÖSD/telc/ECL en conditions réelles, avec rapport de résultats.")}
       </table>
       <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:20px">
         <p style="margin:0;font-size:13px;color:#166534">
           💡 <strong>Parcours recommandé :</strong> Chapitres → Exercices de session → Examens blancs.
           Progressez niveau par niveau : chaque niveau supérieur se débloque quand vous atteignez 70 % de score moyen sur 5 sessions.
         </p>
       </div>
       ${ctaButton("Accéder à la plateforme maintenant →", `${APP_URL}/dashboard`)}
       <p style="font-size:13px;color:#64748b;text-align:center;margin:0">
         Pour continuer après votre essai →
         <a href="${APP_URL}/pricing" style="color:#2563eb;font-weight:600">voir les offres</a>
       </p>
       <p style="margin-top:20px;color:#475569;font-size:14px">Viel Erfolg bei der Vorbereitung ! 🍀</p>`
    ),
  }),

  /**
   * Email marketing J+2 : rappel des avantages concrets.
   * Envoyé si l'utilisateur n'a pas encore souscrit à une offre payante.
   */
  marketingReminder: (name: string) => ({
    subject: "📚 [GermanPass] Avez-vous découvert tout ce que la plateforme peut faire pour vous ?",
    html: layout(
      `<h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Bonjour ${name},</h2>
       <p style="color:#475569;font-size:15px;margin:0 0 20px">
         Vous vous êtes inscrit(e) sur GermanPass il y a quelques jours.
         Avez-vous eu l'occasion d'explorer tout ce que la plateforme peut faire pour votre préparation ?
       </p>

       <!-- Stats / avantages -->
       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
         <tr>
           <td style="padding:4px">
             <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
               <div style="font-size:28px;font-weight:700;color:#16a34a">4</div>
               <div style="font-size:12px;color:#166534;font-weight:600">compétences couvertes</div>
               <div style="font-size:11px;color:#4ade80">Lesen • Hören • Schreiben • Sprechen</div>
             </div>
           </td>
           <td style="padding:4px">
             <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center">
               <div style="font-size:28px;font-weight:700;color:#2563eb">4</div>
               <div style="font-size:12px;color:#1e40af;font-weight:600">organismes supportés</div>
               <div style="font-size:11px;color:#60a5fa">Goethe • ÖSD • telc • ECL</div>
             </div>
           </td>
           <td style="padding:4px">
             <div style="background:#fdf4ff;border-radius:8px;padding:16px;text-align:center">
               <div style="font-size:28px;font-weight:700;color:#9333ea">6</div>
               <div style="font-size:12px;color:#6b21a8;font-weight:600">niveaux (A1 → C2)</div>
               <div style="font-size:11px;color:#c084fc">Du débutant à l'expert</div>
             </div>
           </td>
         </tr>
       </table>

       <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px">Pourquoi nos apprenants choisissent GermanPass :</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
         ${featureRow("📚", "Module Apprendre complet", "Chapitres structurés par niveau et thème, avec exercices pratiques à valider en fin de session — une progression pédagogique claire : chapitres → exercices → examens blancs.")}
         ${featureRow("🃏", "Flashcards SRS pour mémoriser durablement", "Le système de répétition espacée (SM-2) programme chaque révision au moment exact où votre mémoire en a besoin — vocabulaire ancré pour le long terme, pas juste pour l'examen.")}
         ${featureRow("🎯", "Des exercices calqués sur les vrais examens", "Structure, timing et barème conformes aux formats officiels publiés — entraînez-vous dans les conditions réelles.")}
         ${featureRow("🤖", "Corrections IA ultra-personnalisées", "Votre écrit est corrigé critère par critère (fond, forme, vocabulaire, grammaire) avec des explications en français.")}
         ${featureRow("📊", "Suivi de progression en temps réel", "Visualisez vos points forts et vos lacunes pour concentrer vos révisions là où ça compte le plus.")}
         ${featureRow("⏱️", "Apprenez à gérer votre temps", "Les examens blancs respectent les durées officielles — plus de mauvaises surprises le jour J.")}
       </table>

       <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;margin-bottom:24px">
         <strong style="color:#c2410c;font-size:14px">💡 Le saviez-vous ?</strong>
         <p style="margin:6px 0 0;font-size:13px;color:#9a3412">
           Les candidats qui s'entraînent avec des examens blancs obtiennent en moyenne
           <strong>18 % de points supplémentaires</strong> par rapport à ceux qui révisent sans simulation.
           Ne laissez pas votre résultat au hasard.
         </p>
       </div>

       ${ctaButton("Reprendre ma préparation →", `${APP_URL}/dashboard`)}
       <p style="font-size:13px;color:#64748b;text-align:center">
         Prêt(e) à vous abonner ?
         <a href="${APP_URL}/pricing" style="color:#2563eb;font-weight:600">Voir les offres</a>
       </p>`
    ),
  }),

  /**
   * Email marketing J+5 : offre urgente / CTA fort.
   * Dernier email de la séquence si l'utilisateur n'a toujours pas souscrit.
   */
  marketingUrgent: (name: string) => ({
    subject: "⏰ [GermanPass] Votre préparation ne peut pas attendre — offre spéciale",
    html: layout(
      `<h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Bonjour ${name},</h2>
       <p style="color:#475569;font-size:15px;margin:0 0 20px">
         La préparation à un examen d'allemand demande du temps et de la régularité.
         Chaque jour sans entraînement, c'est du retard sur votre objectif.
       </p>

       <!-- Urgence visuelle -->
       <div style="background:linear-gradient(135deg,#dc2626 0%,#ef4444 100%);border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center">
         <p style="margin:0;color:#fff;font-size:18px;font-weight:700">🔥 Commencez votre préparation sérieuse dès aujourd'hui</p>
         <p style="margin:8px 0 0;color:#fee2e2;font-size:13px">
           Débloquez l'accès complet à toutes les ressources, tous les niveaux, tous les examens.
         </p>
       </div>

       <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px">Avec un abonnement GermanPass, vous accédez à :</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
         ${featureRow("✅", "Module Apprendre complet", "Chapitres structurés par niveau (A1→C2) et thème, exercices pratiques de fin de session, progression pédagogique guidée : chapitres → exercices → examens blancs.")}
         ${featureRow("✅", "Flashcards SRS illimitées", "Répétition espacée (SM-2) pour mémoriser vocabulaire et grammaire durablement — des milliers de cartes par niveau, révisées au bon moment.")}
         ${featureRow("✅", "Examens blancs illimités", "Simulez autant d'examens que vous le souhaitez, Goethe B1, ÖSD B2, telc C1… tous les formats.")}
         ${featureRow("✅", "Corrections IA sans limite", "Soumettez vos productions écrites et orales, recevez des retours détaillés à chaque fois.")}
         ${featureRow("✅", "Bibliothèque de ressources complète", "Des centaines d'exercices par niveau, section et organisme, enrichis en continu.")}
       </table>

       <!-- Plans disponibles -->
       <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px">
         <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1e293b">Nos formules :</p>
         <table width="100%" cellpadding="0" cellspacing="0">
           <tr>
             <td style="padding:8px 12px;background:#fff;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:8px">
               <strong style="color:#2563eb">Accès 7 jours</strong> — idéal pour un dernier sprint avant l'examen
             </td>
           </tr>
           <tr><td style="height:8px"></td></tr>
           <tr>
             <td style="padding:8px 12px;background:#fff;border-radius:6px;border:1px solid #e2e8f0">
               <strong style="color:#2563eb">Accès 30 jours</strong> — pour une préparation complète et sereine
             </td>
           </tr>
           <tr><td style="height:8px"></td></tr>
           <tr>
             <td style="padding:8px 12px;background:#eff6ff;border-radius:6px;border:2px solid #2563eb">
               <strong style="color:#1d4ed8">⭐ Accès 90 jours</strong> — le plus populaire : progressez à votre rythme
             </td>
           </tr>
         </table>
       </div>

       ${ctaButton("🚀 Voir les offres et s'abonner →", `${APP_URL}/pricing`)}

       <p style="font-size:13px;color:#64748b;text-align:center;margin:0">
         Une question ? Répondez directement à cet e-mail, nous vous répondrons sous 24 h.
       </p>
       <p style="margin-top:16px;color:#475569;font-size:13px;text-align:center">
         Viel Erfolg ! L'équipe GermanPass 🇩🇪
       </p>`
    ),
  }),

  /** Email de félicitations envoyé quand un nouveau niveau est débloqué. */
  levelUnlocked: (name: string, newLevel: string) => ({
    subject: `🎉 Félicitations ! Tu as débloqué le niveau ${newLevel} !`,
    html: layout(
      `<h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Bravo, ${name} ! 🎉</h2>
       <p style="color:#475569;font-size:15px;margin:0 0 20px">
         Tu as atteint <strong>70 % de score moyen</strong> sur au moins 5 sessions — c'est une vraie preuve de maîtrise !
       </p>
       <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:24px">
         <strong style="color:#15803d;font-size:16px">🔓 Niveau ${newLevel} débloqué !</strong><br>
         <span style="font-size:13px;color:#166534">Tu peux maintenant accéder à tous les exercices, chapitres et flashcards de niveau ${newLevel}.</span>
       </div>
       <p style="color:#374151;font-size:14px;margin:0 0 20px">
         Continue à t'entraîner régulièrement pour progresser vers le niveau suivant. Chaque session compte !
       </p>
       ${ctaButton(`Commencer le niveau ${newLevel} →`, `${APP_URL}/practice/lesen`)}
       <p style="margin-top:16px;color:#475569;font-size:13px">Viel Erfolg ! L'équipe GermanPass 🇩🇪</p>`
    ),
  }),

  /** Lien de réinitialisation de mot de passe (expire dans 1 h). */
  passwordReset: (name: string, resetUrl: string) => ({
    subject: "Réinitialisation de votre mot de passe",
    html: layout(
      `<p>Bonjour ${name},</p>
       <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
       <p style="margin-top:16px">
         <a href="${resetUrl}"
            style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
           Réinitialiser mon mot de passe →
         </a>
       </p>
       <p style="margin-top:12px;font-size:12px;color:#888">
         Ce lien est valable <strong>1 heure</strong>. Si vous n'avez pas effectué cette demande, ignorez cet e-mail.
       </p>`
    ),
  }),
  /** Invitation : compte créé par l'admin, lien pour définir le mot de passe (TTL 7 j). */
  accountInvitation: (name: string, inviteUrl: string, until: Date) => ({
    subject: "Votre compte GermanPass est prêt — définissez votre mot de passe",
    html: layout(
      `<h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Bienvenue, ${name} !</h2>
       <p style="color:#475569;font-size:15px;margin:0 0 16px">
         Un compte GermanPass a été créé pour vous. Votre accès est <strong>actif jusqu'au
         ${until.toLocaleDateString("fr-FR")}</strong>.
       </p>
       <p style="color:#475569;font-size:15px;margin:0 0 8px">
         Pour commencer, définissez votre mot de passe :
       </p>
       ${ctaButton("Définir mon mot de passe →", inviteUrl)}
       <p style="font-size:12px;color:#888;text-align:center;margin:0">
         Ce lien est valable <strong>7 jours</strong>. Connectez-vous ensuite avec votre adresse e-mail.
       </p>`
    ),
  }),
  accountActivated: (name: string, until: Date) => ({
    subject: "Votre accès est activé / Ihr Zugang ist aktiviert",
    html: layout(
      `<p>Bonjour ${name},</p>
       <p>Votre compte a été activé. Votre accès est valable jusqu'au <strong>${until.toLocaleDateString("fr-FR")}</strong>.</p>
       <p>Viel Erfolg bei der Vorbereitung!</p>`
    ),
  }),
  proofRejected: (name: string, reason: string) => ({
    subject: "Preuve de paiement refusée",
    html: layout(
      `<p>Bonjour ${name},</p>
       <p>Votre preuve de paiement a été refusée : <em>${reason}</em></p>
       <p>Vous pouvez en soumettre une nouvelle depuis votre espace.</p>`
    ),
  }),
  accessExpiringSoon: (name: string, until: Date) => ({
    subject: "Votre accès expire bientôt",
    html: layout(
      `<p>Bonjour ${name},</p>
       <p>Votre accès expire le <strong>${until.toLocaleDateString("fr-FR")}</strong>. Pensez à le renouveler pour ne pas interrompre votre préparation.</p>`
    ),
  }),
  accessExpired: (name: string) => ({
    subject: "Votre accès a expiré",
    html: layout(
      `<p>Bonjour ${name},</p>
       <p>Votre accès a expiré. Envoyez une nouvelle preuve de paiement pour le réactiver.</p>`
    ),
  }),
};

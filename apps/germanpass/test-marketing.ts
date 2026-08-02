/**
 * test-marketing.ts
 * Script de test end-to-end du flow d'emails marketing.
 *
 * Ce script :
 *  1. Vérifie la connexion Redis (port configuré dans .env)
 *  2. Crée un compte SMTP Ethereal à la volée (test, pas besoin de config SMTP)
 *  3. Simule une inscription utilisateur (sans toucher à la vraie DB)
 *  4. Appelle scheduleMarketingSequence → insère dans Redis Sorted Set
 *  5. Vérifie les entrées Redis
 *  6. Force le traitement immédiat (timestamps dans le passé)
 *  7. Envoie les 2 emails via Ethereal → affiche les URLs de prévisualisation
 *
 * Usage : npx tsx test-marketing.ts
 */

import "dotenv/config";
import Redis from "ioredis";
import nodemailer from "nodemailer";

// ─── CONFIG ────────────────────────────────────────────────────────────────

const TARGET_EMAIL = "krespohernan5@gmail.com";
const TEST_USER = {
  id: "test-user-marketing-001",
  name: "Profi",
  email: TARGET_EMAIL,
};
const SCHEDULE_KEY = "daf:marketing_schedule";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// ─── HELPERS ────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`\n[test] ${msg}`);
}
function ok(msg: string) {
  console.log(`  ✅ ${msg}`);
}
function warn(msg: string) {
  console.warn(`  ⚠️  ${msg}`);
}
function fail(msg: string) {
  console.error(`  ❌ ${msg}`);
}

// ─── EMAIL TEMPLATES (copie locale pour le test) ───────────────────────────

const APP_URL_T = APP_URL;

const ctaButton = (text: string, href: string) =>
  `<p style="text-align:center;margin:28px 0">
    <a href="${href}"
       style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
      ${text}
    </a>
  </p>`;

const featureRow = (icon: string, title: string, desc: string) =>
  `<tr><td style="padding:10px 0">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:44px;font-size:22px;vertical-align:top;padding-top:2px">${icon}</td>
      <td><strong style="color:#1e293b;font-size:14px">${title}</strong>
      <p style="margin:2px 0 0;font-size:13px;color:#64748b">${desc}</p></td>
    </tr></table>
  </td></tr>`;

function layout(body: string) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:28px 40px;text-align:center">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">🇩🇪 GermanPass</h1>
        <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px">La plateforme n°1 de préparation aux examens d'allemand</p>
      </td></tr>
      <tr><td style="padding:36px 40px">${body}</td></tr>
      <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
        <p style="margin:0;font-size:11px;color:#94a3b8">Plateforme indépendante — non affiliée au Goethe-Institut, ÖSD, telc ou ECL.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const templates = {
  email2: (name: string) => ({
    subject: "📚 [GermanPass] Avez-vous découvert tout ce que la plateforme peut faire pour vous ?",
    html: layout(
      `<h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Bonjour ${name},</h2>
       <p style="color:#475569;font-size:15px;margin:0 0 20px">
         Vous vous êtes inscrit(e) sur GermanPass. Avez-vous eu l'occasion d'explorer tout ce que la plateforme peut faire pour votre préparation ?
       </p>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
         <tr>
           <td style="padding:4px"><div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
             <div style="font-size:28px;font-weight:700;color:#16a34a">4</div>
             <div style="font-size:12px;color:#166534;font-weight:600">compétences couvertes</div>
             <div style="font-size:11px;color:#4ade80">Lesen • Hören • Schreiben • Sprechen</div>
           </div></td>
           <td style="padding:4px"><div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center">
             <div style="font-size:28px;font-weight:700;color:#2563eb">4</div>
             <div style="font-size:12px;color:#1e40af;font-weight:600">organismes supportés</div>
             <div style="font-size:11px;color:#60a5fa">Goethe • ÖSD • telc • ECL</div>
           </div></td>
           <td style="padding:4px"><div style="background:#fdf4ff;border-radius:8px;padding:16px;text-align:center">
             <div style="font-size:28px;font-weight:700;color:#9333ea">6</div>
             <div style="font-size:12px;color:#6b21a8;font-weight:600">niveaux (A1 → C2)</div>
             <div style="font-size:11px;color:#c084fc">Du débutant à l'expert</div>
           </div></td>
         </tr>
       </table>
       <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px">Pourquoi nos apprenants choisissent GermanPass :</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
         ${featureRow("🎯", "Des exercices calqués sur les vrais examens", "Structure, timing et barème conformes aux formats officiels — entraînez-vous dans les conditions réelles.")}
         ${featureRow("🤖", "Corrections IA ultra-personnalisées", "Votre écrit est corrigé critère par critère avec des explications en français.")}
         ${featureRow("📊", "Suivi de progression en temps réel", "Visualisez vos points forts et vos lacunes pour concentrer vos révisions là où ça compte.")}
         ${featureRow("🔁", "Mémorisez durablement avec les flashcards SRS", "Le système SM-2 optimise votre mémoire à long terme.")}
       </table>
       <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;margin-bottom:24px">
         <strong style="color:#c2410c;font-size:14px">💡 Le saviez-vous ?</strong>
         <p style="margin:6px 0 0;font-size:13px;color:#9a3412">
           Les candidats qui s'entraînent avec des examens blancs obtiennent en moyenne
           <strong>18 % de points supplémentaires</strong>. Ne laissez pas votre résultat au hasard.
         </p>
       </div>
       ${ctaButton("Reprendre ma préparation →", `${APP_URL_T}/dashboard`)}
       <p style="font-size:13px;color:#64748b;text-align:center">
         Prêt(e) à vous abonner ? <a href="${APP_URL_T}/pricing" style="color:#2563eb;font-weight:600">Voir les offres</a>
       </p>`
    ),
  }),

  email3: (name: string) => ({
    subject: "⏰ [GermanPass] Votre préparation ne peut pas attendre — offre spéciale",
    html: layout(
      `<h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Bonjour ${name},</h2>
       <p style="color:#475569;font-size:15px;margin:0 0 20px">
         La préparation à un examen d'allemand demande du temps et de la régularité.
         Chaque jour sans entraînement, c'est du retard sur votre objectif.
       </p>
       <div style="background:linear-gradient(135deg,#dc2626,#ef4444);border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center">
         <p style="margin:0;color:#fff;font-size:18px;font-weight:700">🔥 Commencez votre préparation sérieuse dès aujourd'hui</p>
         <p style="margin:8px 0 0;color:#fee2e2;font-size:13px">Débloquez l'accès complet à toutes les ressources, tous les niveaux, tous les examens.</p>
       </div>
       <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px">Avec un abonnement GermanPass, vous accédez à :</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
         ${featureRow("✅", "Examens blancs illimités", "Simulez autant d'examens que vous voulez — Goethe B1, ÖSD B2, telc C1… tous les formats.")}
         ${featureRow("✅", "Corrections IA sans limite", "Soumettez vos productions écrites et orales, recevez des retours détaillés.")}
         ${featureRow("✅", "Bibliothèque de ressources complète", "Des centaines d'exercices par niveau, section et organisme, enrichis en continu.")}
         ${featureRow("✅", "Suivi SRS + recommandations personnalisées", "L'IA adapte votre programme selon vos résultats.")}
       </table>
       <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px">
         <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1e293b">Nos formules :</p>
         <table width="100%" cellpadding="0" cellspacing="0">
           <tr><td style="padding:8px 12px;background:#fff;border-radius:6px;border:1px solid #e2e8f0">
             <strong style="color:#2563eb">Accès 7 jours</strong> — idéal pour un dernier sprint avant l'examen
           </td></tr>
           <tr><td style="height:8px"></td></tr>
           <tr><td style="padding:8px 12px;background:#fff;border-radius:6px;border:1px solid #e2e8f0">
             <strong style="color:#2563eb">Accès 30 jours</strong> — pour une préparation complète et sereine
           </td></tr>
           <tr><td style="height:8px"></td></tr>
           <tr><td style="padding:8px 12px;background:#eff6ff;border-radius:6px;border:2px solid #2563eb">
             <strong style="color:#1d4ed8">⭐ Accès 90 jours</strong> — le plus populaire : progressez à votre rythme
           </td></tr>
         </table>
       </div>
       ${ctaButton("🚀 Voir les offres et s'abonner →", `${APP_URL_T}/pricing`)}
       <p style="font-size:13px;color:#64748b;text-align:center">Une question ? Répondez directement à cet e-mail.</p>
       <p style="margin-top:16px;color:#475569;font-size:13px;text-align:center">Viel Erfolg ! L'équipe GermanPass 🇩🇪</p>`
    ),
  }),
};

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  GermanPass — Test flow emails marketing");
  console.log("═══════════════════════════════════════════════════════");

  // ── 1. Redis ──────────────────────────────────────────────────────────────
  log("1. Connexion Redis...");
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  console.log(`   URL : ${redisUrl}`);

  const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 5000 });
  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong === "PONG") {
      ok(`Redis connecté (${redisUrl})`);
    } else {
      fail(`Réponse inattendue : ${pong}`);
      process.exit(1);
    }
  } catch (e: unknown) {
    fail(`Impossible de se connecter à Redis : ${e instanceof Error ? e.message : String(e)}`);
    fail("Vérifiez que Redis tourne sur " + redisUrl);
    process.exit(1);
  }

  // ── 2. SMTP (Gmail réel) ──────────────────────────────────────────────────
  log("2. Connexion SMTP Gmail...");
  const smtpUser = process.env.SMTP_USER ?? "";
  const smtpPass = process.env.SMTP_PASSWORD ?? "";
  const smtpHost = process.env.SMTP_HOST ?? "";

  if (!smtpHost || !smtpUser || !smtpPass) {
    fail("SMTP_HOST / SMTP_USER / SMTP_PASSWORD non configurés dans .env");
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.verify();
    ok(`SMTP connecté (${smtpHost} → ${smtpUser})`);
  } catch (e: unknown) {
    fail(`Connexion SMTP échouée : ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  // ── 3. Scheduling dans Redis ──────────────────────────────────────────────
  log("3. Simulation d'une inscription et planification des emails marketing...");

  // Nettoie les entrées test précédentes
  const existing = await redis.zrangebyscore(SCHEDULE_KEY, "-inf", "+inf");
  const testEntries = existing.filter((m) => m.includes(TEST_USER.id));
  if (testEntries.length > 0) {
    await redis.zrem(SCHEDULE_KEY, ...testEntries);
    console.log(`   (${testEntries.length} entrée(s) test précédente(s) supprimée(s))`);
  }

  // Nettoie les clés de dédup test
  await redis.del(`marketing:sent:${TEST_USER.id}:2`);
  await redis.del(`marketing:sent:${TEST_USER.id}:3`);

  // Planifie avec timestamps DANS LE PASSÉ pour forcer le traitement immédiat
  const pastNow = Math.floor(Date.now() / 1000);
  const scoreEmail2 = pastNow - 10; // déjà dû
  const scoreEmail3 = pastNow - 5;  // déjà dû

  await redis.zadd(
    SCHEDULE_KEY,
    "NX",
    scoreEmail2,
    JSON.stringify({ userId: TEST_USER.id, step: 2 })
  );
  await redis.zadd(
    SCHEDULE_KEY,
    "NX",
    scoreEmail3,
    JSON.stringify({ userId: TEST_USER.id, step: 3 })
  );

  ok("Emails 2 et 3 planifiés dans Redis (timestamps passés → traitement immédiat)");

  // ── 4. Vérification Redis ─────────────────────────────────────────────────
  log("4. Vérification du contenu Redis Sorted Set...");
  const allEntries = await redis.zrangebyscore(SCHEDULE_KEY, "-inf", "+inf", "WITHSCORES");
  const testOnes = [];
  for (let i = 0; i < allEntries.length; i += 2) {
    const member = allEntries[i];
    const score = allEntries[i + 1];
    if (!member || !score) continue;
    if (member.includes(TEST_USER.id)) {
      const parsed = JSON.parse(member);
      const date = new Date(Number(score) * 1000).toLocaleString("fr-FR");
      testOnes.push({ ...parsed, scheduledFor: date });
      ok(`  → step=${parsed.step} | scheduledFor=${date} | userId=${parsed.userId}`);
    }
  }
  if (testOnes.length === 0) {
    fail("Aucune entrée test trouvée dans Redis !");
    process.exit(1);
  }

  // ── 5. Traitement et envoi ────────────────────────────────────────────────
  log("5. Traitement du Sorted Set (processMarketingEmails simulé)...");
  console.log(`   Destinataire : ${TEST_USER.email}`);

  const nowTs = Math.floor(Date.now() / 1000);
  const dueMembers = await redis.zrangebyscore(SCHEDULE_KEY, "-inf", nowTs);
  const testDue = dueMembers.filter((m) => m.includes(TEST_USER.id));

  console.log(`   ${testDue.length} email(s) en attente d'envoi`);

  const previewUrls: Array<{ step: number; url: string }> = [];

  for (const member of testDue) {
    const entry = JSON.parse(member) as { userId: string; step: 2 | 3 };
    const { step } = entry;

    // Supprime de la file
    await redis.zrem(SCHEDULE_KEY, member);

    // Sélectionne le template
    const tpl = step === 2 ? templates.email2(TEST_USER.name) : templates.email3(TEST_USER.name);

    // Envoie via Gmail réel
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM ?? `"GermanPass" <${smtpUser}>`,
        to: TEST_USER.email,
        subject: tpl.subject,
        html: tpl.html,
      });

      previewUrls.push({ step, url: `Message-ID: ${info.messageId}` });

      // Marque comme envoyé
      await redis.set(`marketing:sent:${TEST_USER.id}:${step}`, "1", "EX", 3600);

      ok(`Email step=${step} envoyé → ${info.messageId}`);
    } catch (e: unknown) {
      fail(`Erreur envoi step=${step} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 6. Rapport final ──────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  RAPPORT DE TEST");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Redis        : ✅ connecté (${redisUrl})`);
  console.log(`  SMTP         : ✅ Gmail (${smtpUser})`);
  console.log(`  Emails envoyés : ${previewUrls.length}/${testDue.length}`);

  if (previewUrls.length > 0) {
    console.log("\n  📬 Emails livrés dans la boîte Gmail krespohernan5@gmail.com :");
    for (const { step, url } of previewUrls) {
      const label = step === 2 ? "J+2 (rappel avantages)" : "J+5 (offre urgente)";
      console.log(`\n  Email ${label} : ${url}`);
    }
    console.log("\n  ✅ Vérifiez votre boîte Gmail !");
  } else {
    warn("Aucun email envoyé. Vérifiez les erreurs ci-dessus.");
  }

  console.log("═══════════════════════════════════════════════════════\n");

  await redis.quit();
}

main().catch((e) => {
  console.error("\n[FATAL]", e);
  process.exit(1);
});

/**
 * Vérification Fapshi (KB-13) — smoke test des clés et de la création de paiement.
 *
 * N'écrit RIEN en base : appelle directement `createCollection` de l'adaptateur
 * (un appel à `initiate-pay`) et affiche le lien de paiement hébergé. Prouve que
 * les clés sont bonnes et qu'un paiement s'ouvre. La confirmation par webhook
 * suppose une ligne persistée (parcours applicatif réel) et n'est pas testée ici.
 *
 * Lancer (depuis la racine du monorepo) :
 *   pnpm --filter @kebrane/germanpass fapshi:smoke
 * Prérequis : FAPSHI_API_KEY / FAPSHI_API_USER (+ FAPSHI_MODE) dans apps/germanpass/.env
 */
import { PaymentChannel } from "@kebrane/core";
import { fapshiFromEnv } from "@kebrane/core/providers/fapshi";

async function main(): Promise<void> {
  const provider = fapshiFromEnv();
  if (!provider) {
    console.error(
      "✗ Fapshi non configuré. Renseigne dans apps/germanpass/.env :\n" +
        "  FAPSHI_API_KEY, FAPSHI_API_USER (+ FAPSHI_MODE=sandbox|live)."
    );
    process.exit(1);
  }

  const amount = Number(process.env.SMOKE_AMOUNT ?? "2500");
  const mode = process.env.FAPSHI_MODE ?? "sandbox";
  console.log(`→ Création d'un paiement Fapshi de ${amount} XAF (mode ${mode})…`);

  const res = await provider.createCollection({
    accountId: "smoke-test",
    productSlug: "germanpass",
    plan: "mensuel",
    amount,
    channel: PaymentChannel.MTN_MOMO,
  });

  console.log("✓ Paiement initié.");
  console.log("  providerRef (transId) :", res.providerRef);
  console.log("  Lien de paiement      :", res.redirectUrl);
  console.log(
    "\nOuvre le lien pour payer (le payeur choisit MTN ou Orange sur la page Fapshi).\n" +
      "Pour la confirmation, définis l'URL de webhook du service sur le dashboard Fapshi :\n" +
      "  <URL publique>/api/webhooks/fapshi  (ngrok en dev, le domaine réel en prod)."
  );
}

main().catch((e: unknown) => {
  console.error("✗ Échec :", e instanceof Error ? e.message : e);
  process.exit(1);
});

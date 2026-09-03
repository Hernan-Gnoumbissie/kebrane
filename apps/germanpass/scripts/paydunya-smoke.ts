/**
 * Vérification PayDunya (KB-13) — smoke test des clés et de la création de facture.
 *
 * N'écrit RIEN en base : appelle directement `createCollection` de l'adaptateur
 * (un simple appel à l'API PayDunya) et affiche l'URL de paiement hébergée.
 * C'est le premier palier de configuration : prouver que les clés sont bonnes
 * et qu'une facture s'ouvre. La confirmation via IPN, elle, suppose une ligne
 * de paiement persistée (donc le parcours applicatif réel) et n'est pas testée ici.
 *
 * Lancer (depuis la racine du monorepo) :
 *   pnpm --filter @kebrane/germanpass paydunya:smoke
 * Prérequis : PAYDUNYA_* renseignées dans apps/germanpass/.env
 */
import { payDunyaFromEnv, PaymentChannel } from "@kebrane/core";

async function main(): Promise<void> {
  const provider = payDunyaFromEnv();
  if (!provider) {
    console.error(
      "✗ PayDunya non configuré. Renseigne dans apps/germanpass/.env :\n" +
        "  PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN,\n" +
        "  PAYDUNYA_RETURN_URL, PAYDUNYA_CANCEL_URL, PAYDUNYA_CALLBACK_URL."
    );
    process.exit(1);
  }

  const amount = Number(process.env.SMOKE_AMOUNT ?? "2500");
  const mode = process.env.PAYDUNYA_MODE ?? "test";
  console.log(`→ Création d'une facture PayDunya de ${amount} XAF (mode ${mode})…`);

  const res = await provider.createCollection({
    accountId: "smoke-test",
    productSlug: "germanpass",
    plan: "mensuel",
    amount,
    channel: PaymentChannel.MTN_MOMO,
  });

  console.log("✓ Facture créée.");
  console.log("  providerRef (token) :", res.providerRef);
  console.log("  URL de paiement     :", res.redirectUrl);
  console.log(
    "\nOuvre l'URL pour payer en sandbox. Pour que l'IPN atteigne /api/webhooks/paydunya,\n" +
      "PAYDUNYA_CALLBACK_URL doit être une URL PUBLIQUE (ngrok en dev, le domaine réel en prod)."
  );
}

main().catch((e: unknown) => {
  console.error("✗ Échec :", e instanceof Error ? e.message : e);
  process.exit(1);
});

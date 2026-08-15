/**
 * Remontée des erreurs serveur vers le journal Kebrane (KB-15).
 *
 * `onRequestError` est le crochet CENTRAL de Next : il voit toutes les erreurs
 * serveur — routes, actions, rendu — sans qu'il faille instrumenter chaque
 * `catch`. Un crochet unique se maintient ; des appels dispersés s'oublient.
 *
 * Le journal reçoit le strict nécessaire au tri (type, route, méthode) et
 * jamais la pile : il est lu largement, et une trace contient volontiers des
 * jetons ou des données personnelles. Le détail reste dans les logs serveur.
 */
export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string }
): Promise<void> {
  // Import différé : `instrumentation.ts` est évalué très tôt, avant que la
  // configuration ne soit prête. L'importer statiquement ferait tomber le
  // démarrage sur une erreur d'environnement.
  const { logKebraneError } = await import("@/lib/kebrane");
  await logKebraneError({
    name: error instanceof Error ? error.name : "UnknownError",
    route: request.path,
    method: request.method,
  });
}

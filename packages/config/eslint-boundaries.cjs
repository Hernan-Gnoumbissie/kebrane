/**
 * Règle de frontière Kebrane (v0.2) : un produit ne parle à Core que par son API publique.
 * À étendre dans le .eslintrc des apps PRODUIT (apps/germanpass, …) :
 *   { "extends": ["./node_modules/@kebrane/config/eslint-boundaries.cjs"] }
 * ou à fusionner dans la config eslint racine.
 *
 * ⚠ À n'appliquer QU'AUX PRODUITS : `packages/core` accède légitimement à
 * `@kebrane/db` — c'est précisément son rôle.
 *
 * Deux interdits :
 *  1. la COUCHE DONNÉES du domaine (`@kebrane/db` et le client Prisma Core
 *     `@kebrane/prisma-client`) — un produit passe par `@kebrane/core`, jamais
 *     par les tables ;
 *  2. les IMPORTS PROFONDS dans les paquets partagés — on importe l'API publique
 *     (`@kebrane/core`), pas ses internes (`@kebrane/core/src/...`).
 */
module.exports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@kebrane/db",
            message:
              "Frontière Kebrane : un produit n'accède jamais aux tables Core. Passez par l'interface de services \"@kebrane/core\".",
          },
          {
            name: "@kebrane/prisma-client",
            message:
              "Frontière Kebrane : le client Prisma de la base Core est réservé à @kebrane/db. Passez par \"@kebrane/core\".",
          },
        ],
        patterns: [
          {
            group: ["@kebrane/db/*", "@kebrane/prisma-client/*"],
            message:
              "Frontière Kebrane : un produit n'accède jamais aux tables Core. Passez par l'interface de services \"@kebrane/core\".",
          },
          {
            group: [
              "@kebrane/core/src/*",
              "@kebrane/core/dist/*",
              "@kebrane/core/scripts/*",
              "@kebrane/*/src/internal/*",
            ],
            message:
              "Frontière Kebrane : importez l'API publique du paquet (ex. \"@kebrane/core\"), pas ses internes.",
          },
        ],
      },
    ],
  },
};

// @kebrane/db — client Prisma partagé (singleton). Base Core de la plateforme.
//
// ⚠ Ce client cohabite, dans le PROCESSUS d'un produit, avec le client Prisma du
// produit (ex. `apps/germanpass/src/lib/db.ts`). Trois précautions, sans quoi les
// deux se marchent dessus :
//   1. client généré sous `@kebrane/prisma-client` et non `@prisma/client`
//      (monorepo hoisté = un seul `@prisma/client` partagé) — voir schema.prisma ;
//   2. clé de singleton global DISTINCTE (`__kebranePrisma`) ;
//   3. URL lue dans `KEBRANE_DATABASE_URL` (repli `DATABASE_URL` pour les apps
//      sans base produit, ex. apps/kebrane) et passée explicitement, pour ne pas
//      hériter du `DATABASE_URL` de la base métier du produit.
import { PrismaClient } from "@kebrane/prisma-client";

const globalForPrisma = globalThis as unknown as { __kebranePrisma?: PrismaClient };

const coreDatabaseUrl = process.env.KEBRANE_DATABASE_URL ?? process.env.DATABASE_URL;

export const db =
  globalForPrisma.__kebranePrisma ??
  new PrismaClient({
    ...(coreDatabaseUrl ? { datasourceUrl: coreDatabaseUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__kebranePrisma = db;

// Ré-exports EXPLICITES (pas de `export *`) : le client généré est un module
// CommonJS, dont Turbopack ne connaît les exports qu'à l'exécution.
export type {
  Account,
  Product,
  ProductAccess,
  Event,
  Payment,
  Plan,
} from "@kebrane/prisma-client";
export {
  Role,
  ProductStatus,
  AccessStatus,
  EventSeverity,
  PaymentChannel,
  PaymentStatus,
  Prisma,
} from "@kebrane/prisma-client";

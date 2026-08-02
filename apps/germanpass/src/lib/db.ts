import { PrismaClient } from "@prisma/client";

// Clé de singleton PROPRE à GermanPass : le processus héberge aussi le client
// Prisma de la base Core (`@kebrane/db`, clé `__kebranePrisma`). Une clé commune
// ferait que le premier module chargé imposerait sa base à l'autre.
const globalForPrisma = globalThis as unknown as { __germanpassPrisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.__germanpassPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__germanpassPrisma = db;

/**
 * Seed : compte admin + blueprints d'examens (22 combinaisons provider × niveau).
 * Idempotent : upsert sur clés naturelles.
 */
import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BLUEPRINTS } from "./blueprints";

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@germanpass.local";
  // En production, forcer la définition explicite d'un mot de passe via variable d'env.
  // Valeur de secours uniquement acceptée hors production.
  if (process.env.NODE_ENV === "production" && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error(
      "[seed] SEED_ADMIN_PASSWORD est requis en production. " +
        "Définissez cette variable d'environnement avant de relancer le seed."
    );
  }
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(password, rounds);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Administrateur",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✔ Admin seedé : ${email}`);
}

async function seedBlueprints(): Promise<void> {
  for (const bp of BLUEPRINTS) {
    await prisma.examBlueprint.upsert({
      where: {
        provider_level_variant_version: {
          provider: bp.provider,
          level: bp.level,
          variant: bp.variant,
          version: 1,
        },
      },
      update: {
        title: bp.title,
        structure: bp.structure as unknown as Prisma.InputJsonValue,
        scoringRules: bp.scoringRules as unknown as Prisma.InputJsonValue,
        sourcesNote: bp.sourcesNote,
      },
      create: {
        provider: bp.provider,
        level: bp.level,
        variant: bp.variant,
        version: 1,
        active: true,
        title: bp.title,
        structure: bp.structure as unknown as Prisma.InputJsonValue,
        scoringRules: bp.scoringRules as unknown as Prisma.InputJsonValue,
        sourcesNote: bp.sourcesNote,
      },
    });
  }
  console.log(`✔ ${BLUEPRINTS.length} blueprints seedés`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedBlueprints();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

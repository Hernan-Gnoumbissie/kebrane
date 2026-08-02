/**
 * Crée (ou promeut) un compte ADMIN actif.
 * Usage : npx tsx scripts/add-admin.ts <email> <motdepasse>
 * Exemple : npx tsx scripts/add-admin.ts krespohernan5@gmail.com 'MonMotDePasse!'
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = (process.argv[2] ?? "").trim().toLowerCase();
const password = process.argv[3] ?? "";

async function main() {
  if (!email || !password) {
    console.log("Usage : npx tsx scripts/add-admin.ts <email> <motdepasse>");
    process.exit(1);
  }
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(password, rounds);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", status: "ACTIVE" },
    create: {
      email,
      name: "Administrateur",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Admin prêt : ${user.email} (rôle ${user.role}, statut ${user.status})`);
}

main().finally(() => prisma.$disconnect());

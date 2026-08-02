/**
 * Vérifie qu'un mot de passe correspond au hash de l'admin en base.
 * Usage : npx tsx scripts/check-admin-pw.ts [motdepasse]
 * (défaut : Admin1234!)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = process.env.SEED_ADMIN_EMAIL ?? "admin@germanpass.local";
const pw = process.argv[2] ?? "Admin1234!";

async function main() {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) return console.log(`❌ Aucun utilisateur avec l'email ${email}`);
  if (!u.passwordHash) return console.log(`❌ ${email} n'a pas de passwordHash`);
  const ok = await bcrypt.compare(pw, u.passwordHash);
  console.log(`Email    : ${email}`);
  console.log(`Statut   : ${u.status} / rôle ${u.role}`);
  console.log(`Mot de passe testé : "${pw}"`);
  console.log(ok ? "✅ MATCH — ces identifiants sont bons" : "❌ NE CORRESPOND PAS");
}

main().finally(() => prisma.$disconnect());

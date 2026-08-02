import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";
import { redis } from "@/lib/redis";
import { env } from "@/lib/env";
import { sendMail, mailTemplates } from "@/lib/mail";
import { computeNewAccessUntil } from "@/lib/account";

/** Liste paginée des utilisateurs avec filtre statut/recherche. */
export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = 25;

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] }
        : {}),
    };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          accessUntil: true,
          plan: true,
          targetProvider: true,
          targetLevel: true,
          createdAt: true,
        },
      }),
      db.user.count({ where }),
    ]);
    return Response.json({ users, total, page, pageSize });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

const createSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(2).max(120),
  days: z.union([z.literal(1), z.literal(7), z.literal(30), z.literal(90), z.literal(365)]),
  targetProvider: z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"]).optional(),
  targetLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  currentLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
});

/** TTL du lien d'invitation (définition du mot de passe) : 7 jours. */
const INVITE_TTL_SEC = 7 * 86_400;

/**
 * Création d'un compte candidat par l'admin : compte ACTIVE immédiatement pour
 * la durée choisie, puis e-mail d'invitation (lien pour définir le mot de passe).
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const { email, name, days, targetProvider, targetLevel, currentLevel } = parsed.data;

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return Response.json(
        { error: { code: "EMAIL_TAKEN", message: "Un compte existe déjà avec cet e-mail." } },
        { status: 409 }
      );
    }

    const accessUntil = computeNewAccessUntil(null, days);
    const user = await db.user.create({
      data: {
        email,
        name,
        status: "ACTIVE",
        accessUntil,
        emailVerifiedAt: new Date(),
        currentLevel,
        ...(targetProvider ? { targetProvider } : {}),
        ...(targetLevel ? { targetLevel } : {}),
      },
      select: { id: true, email: true, name: true },
    });
    await audit({
      actorId: admin.id,
      action: "user.admin_create",
      targetType: "User",
      targetId: user.id,
      metadata: { days, accessUntil: accessUntil.toISOString() },
    });

    // Lien d'invitation (réutilise le mécanisme de réinitialisation de mot de passe).
    const token = randomBytes(32).toString("hex");
    await redis.set(`pwd_reset_token:${token}`, user.id, "EX", INVITE_TTL_SEC);
    await redis.set(`pwd_reset:${user.id}`, token, "EX", INVITE_TTL_SEC);
    const inviteUrl = `${env.APP_URL}/reset-password?token=${token}`;

    const tpl = mailTemplates.accountInvitation(user.name, inviteUrl, accessUntil);
    await sendMail(user.email, tpl.subject, tpl.html).catch((err) =>
      console.error("[admin/users] e-mail d'invitation non envoyé :", err)
    );

    // inviteUrl renvoyé en secours (à copier si l'e-mail n'arrive pas).
    return Response.json({ user, inviteUrl }, { status: 201 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

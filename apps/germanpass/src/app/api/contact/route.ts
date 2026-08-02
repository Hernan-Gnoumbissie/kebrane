import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  type: z.enum(["PROBLEM", "FEEDBACK", "QUESTION"]).default("QUESTION"),
  message: z.string().min(10).max(5000),
});

/** Formulaire de contact public : support + retours utilisateurs. Anti-spam par IP. */
export async function POST(req: Request): Promise<Response> {
  try {
    const ip = getClientIp(req.headers);
    const rl = await rateLimit(`contact:${ip}`, 5, 3600);
    if (!rl.allowed) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Trop de messages envoyés. Réessayez plus tard." } },
        { status: 429 }
      );
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }

    await db.contactMessage.create({ data: parsed.data });
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: { code: "INTERNAL", message: "Envoi impossible, réessayez." } }, { status: 500 });
  }
}

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  provider: z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  taskNumber: z.coerce.number().int().positive(),
  taskFormat: z.enum(["LETTER_FORMAL", "LETTER_INFORMAL", "ESSAY", "FORUM_POST"]),
  title: z.string().min(3).max(200),
  instructions: z.string().min(10),
  minWords: z.coerce.number().int().positive().optional(),
  maxWords: z.coerce.number().int().positive().optional(),
  timeLimitMin: z.coerce.number().int().positive(),
  criteria: z
    .array(
      z.object({
        key: z.string().min(1),
        labelDe: z.string().min(1),
        labelFr: z.string().optional(),
        maxPoints: z.number().positive(),
        description: z.string().optional(),
      })
    )
    .min(1),
  publish: z.boolean().default(false),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const { publish, ...data } = parsed.data;
    const prompt = await db.writingPrompt.create({
      data: { ...data, status: publish ? "PUBLISHED" : "DRAFT" },
    });
    await audit({ actorId: admin.id, action: "writing_prompt.create", targetType: "WritingPrompt", targetId: prompt.id });
    return Response.json({ prompt }, { status: 201 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const level = url.searchParams.get("level");
    const prompts = await db.writingPrompt.findMany({
      where: {
        ...(provider ? { provider: provider as never } : {}),
        ...(level ? { level: level as never } : {}),
        archived: false,
      },
      orderBy: [{ provider: "asc" }, { level: "asc" }, { taskNumber: "asc" }],
    });
    return Response.json({ prompts });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

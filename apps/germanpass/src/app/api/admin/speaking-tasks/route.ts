import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  provider: z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  partNumber: z.coerce.number().int().positive(),
  taskFormat: z.enum(["PICTURE_DESCRIPTION", "PRESENTATION", "DIALOGUE_ROLEPLAY", "PLANNING_TASK"]),
  title: z.string().min(3).max(200),
  instructions: z.string().min(10),
  prepTimeSec: z.coerce.number().int().min(0).default(0),
  speakTimeSec: z.coerce.number().int().positive(),
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
    const task = await db.speakingTask.create({
      data: { ...data, status: publish ? "PUBLISHED" : "DRAFT" },
    });
    await audit({ actorId: admin.id, action: "speaking_task.create", targetType: "SpeakingTask", targetId: task.id });
    return Response.json({ task }, { status: 201 });
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
    const tasks = await db.speakingTask.findMany({
      where: {
        ...(provider ? { provider: provider as never } : {}),
        ...(level ? { level: level as never } : {}),
        archived: false,
      },
      orderBy: [{ provider: "asc" }, { level: "asc" }, { partNumber: "asc" }],
    });
    return Response.json({ tasks });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const courseSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  kind: z.enum(["GRAMMAR", "VOCABULARY", "REDEMITTEL"]),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  position: z.coerce.number().int().min(0).default(0),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const parsed = courseSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const course = await db.course.create({ data: parsed.data });
    await audit({ actorId: admin.id, action: "course.create", targetType: "Course", targetId: course.id });
    return Response.json({ course }, { status: 201 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const courses = await db.course.findMany({
      orderBy: [{ level: "asc" }, { position: "asc" }],
      include: { lessons: { orderBy: { position: "asc" }, select: { id: true, title: true, status: true, position: true } } },
    });
    return Response.json({ courses });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

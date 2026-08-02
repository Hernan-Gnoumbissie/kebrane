import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { getProgressData } from "@/lib/progress";

/** Progression du candidat (les écrans utilisent la lib directement ; API conservée pour usage futur/mobile). */
export async function GET(): Promise<Response> {
  try {
    const user = await requireStudent();
    const data = await getProgressData(user);
    return Response.json(data);
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

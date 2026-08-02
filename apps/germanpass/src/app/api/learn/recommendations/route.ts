import { requireFullPlan, guardErrorResponse } from "@/lib/guards";
import { getRecommendations } from "@/lib/recommendations";

export async function GET(): Promise<Response> {
  try {
    const user = await requireFullPlan();
    const recommendations = await getRecommendations(user.id);
    return Response.json({ recommendations });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

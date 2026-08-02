import { redirect } from "next/navigation";

/** Les statistiques sont désormais intégrées au tableau de bord. */
export default function ProgressPage() {
  redirect("/dashboard");
}

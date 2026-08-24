import { LearnerShell } from "@/components/learner-shell";
import { requireActivePage } from "@/lib/active-gate";

export default async function ProgressLayout({ children }: { children: React.ReactNode }) {
  await requireActivePage();
  return <LearnerShell>{children}</LearnerShell>;
}

import { AppHeader } from "@/components/app-header";
import { requireActivePage } from "@/lib/active-gate";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireActivePage();
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}

import { redirect } from "next/navigation";
import { requireAdmin, GuardError } from "@/lib/guards";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { AdminSidebar } from "./components/AdminSidebar";
import { AdminSearchBar } from "./components/AdminSearchBar";
import { Bell } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Administration — GermanPass" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof GuardError) redirect(e.status === 401 ? "/login" : "/dashboard");
    throw e;
  }

  const [pendingCount, session] = await Promise.all([
    db.paymentProof.count({ where: { status: "PENDING" } }),
    auth(),
  ]);

  const adminName = (session?.user?.name ?? "").trim() || "Admin";
  const initials =
    adminName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar pendingCount={pendingCount} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
          {/* Espace réservé au burger (tous écrans) */}
          <div className="w-9" />

          {/* Search */}
          <AdminSearchBar />

          <div className="flex flex-1 items-center justify-end gap-3">
            {/* Notifications bell */}
            <Link
              href="/admin/proofs"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
              aria-label="Preuves en attente"
            >
              <Bell className="h-4 w-4 text-gray-500" />
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>

            {/* Admin avatar */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {initials}
              </div>
              <span className="hidden text-sm font-medium text-gray-700 sm:block">
                {adminName}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart2,
  Users,
  TrendingUp,
  BookOpen,
  GraduationCap,
  FileText,
  Sparkles,
  PenLine,
  Mic,
  Library,
  Tag,
  Ticket,
  CreditCard,
  MessageSquare,
  Settings,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  exact?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const buildSections = (pendingCount: number): NavSection[] => [
  {
    title: "Général",
    items: [
      { href: "/admin", label: "Vue d'ensemble", icon: Home, exact: true },
      { href: "/admin/stats", label: "Statistiques", icon: BarChart2 },
    ],
  },
  {
    title: "Utilisateurs",
    items: [
      { href: "/admin/users", label: "Tous les inscrits", icon: Users },
      { href: "/admin/progression", label: "Progression", icon: TrendingUp },
    ],
  },
  {
    title: "Contenu",
    items: [
      { href: "/admin/passages", label: "Passages", icon: BookOpen },
      { href: "/admin/courses", label: "Chapitres & Leçons", icon: GraduationCap },
      { href: "/admin/writing", label: "Schreiben", icon: PenLine },
      { href: "/admin/speaking", label: "Sprechen", icon: Mic },
      { href: "/admin/exams", label: "Examens blancs", icon: FileText },
      { href: "/admin/generations", label: "Générations IA", icon: Sparkles },
      { href: "/admin/library", label: "Bibliothèque", icon: Library },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/admin/proofs",
        label: "Abonnements",
        icon: CreditCard,
        badge: pendingCount,
      },
      { href: "/admin/offres", label: "Offres & tarifs", icon: Tag },
      { href: "/admin/promo-codes", label: "Codes promo", icon: Ticket },
      { href: "/admin/messages", label: "Messages", icon: MessageSquare },
      { href: "/admin/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
      {!isActive && !item.badge && (
        <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-40" />
      )}
    </Link>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="mb-1.5 mt-5 flex items-center gap-2 px-3 first:mt-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <div className="flex-1 border-t border-slate-800" />
    </div>
  );
}

export function AdminSidebar({ pendingCount }: { pendingCount: number }) {
  const [open, setOpen] = useState(false);
  const sections = buildSections(pendingCount);
  const closeMenu = () => setOpen(false);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <Link
          href="/admin"
          onClick={closeMenu}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-lg">
            GP
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-white">GermanPass</span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Admin
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <SectionDivider title={section.title} />
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} onNavigate={closeMenu} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 px-3 py-3">
        <Link
          href="/dashboard"
          onClick={closeMenu}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
        >
          ← Retour à l&apos;application
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Burger — ouvre le menu (tous écrans) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-lg"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeMenu}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu de navigation"
      >
        <button
          type="button"
          onClick={closeMenu}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}

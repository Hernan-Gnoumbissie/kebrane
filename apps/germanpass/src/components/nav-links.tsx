"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

/** Liens de navigation desktop avec état actif détecté via usePathname(). */
export function NavLinks({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {nav.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              isActive && "bg-secondary font-semibold"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

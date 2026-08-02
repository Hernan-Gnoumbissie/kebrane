"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/** Barre de recherche de la topbar admin.
 *  Navigue vers /admin/users?q=… au submit (Entrée ou clic sur l'input). */
export function AdminSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/admin/users?q=${encodeURIComponent(q)}` : "/admin/users");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative hidden max-w-sm flex-1 sm:flex"
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un utilisateur…"
        aria-label="Rechercher un utilisateur"
        className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </form>
  );
}

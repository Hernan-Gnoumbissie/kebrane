import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Paramètres — GermanPass Admin" };

async function getSettings() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const [userCount, passageCount, lessonCount, docCount] = await Promise.all([
    db.user.count({ where: { status: { not: "DELETED" } } }),
    db.passage.count({ where: { archived: false } }),
    db.lesson.count(),
    db.document.count(),
  ]);

  return { userCount, passageCount, lessonCount, docCount };
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-1">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default async function AdminSettingsPage() {
  const { userCount, passageCount, lessonCount, docCount } = await getSettings();

  const aiModel   = process.env.AI_MODEL         ?? "Non configuré";
  const budget    = process.env.AI_MONTHLY_BUDGET_USER_USD ?? "Non configuré";
  const appUrl    = process.env.NEXTAUTH_URL      ?? "Non configuré";
  const storageDir = process.env.STORAGE_DIR      ?? "Non configuré";
  const nodeEnv   = process.env.NODE_ENV          ?? "—";

  return (
    <main className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <Section title="📊 Inventaire de la plateforme">
        <Row label="Utilisateurs actifs" value={userCount} />
        <Row label="Passages Lesen/Hören" value={passageCount} />
        <Row label="Leçons (curriculum)" value={lessonCount} />
        <Row label="Documents RAG" value={docCount} />
      </Section>

      <Section title="🤖 Configuration IA">
        <Row label="Modèle principal" value={aiModel} />
        <Row label="Budget mensuel par utilisateur (USD)" value={`$${budget}`} />
        <p className="mt-2 text-xs text-muted-foreground">
          Pour modifier ces valeurs, mettez à jour les variables d&apos;environnement{" "}
          <code className="rounded bg-muted px-1">AI_MODEL</code> et{" "}
          <code className="rounded bg-muted px-1">AI_MONTHLY_BUDGET_USER_USD</code> dans votre fichier <code className="rounded bg-muted px-1">.env</code>.
        </p>
      </Section>

      <Section title="🌐 Environnement">
        <Row label="URL de l'application" value={appUrl} />
        <Row label="Répertoire de stockage" value={storageDir} />
        <Row label="Environnement Node" value={nodeEnv} />
      </Section>

      <Section title="🔧 Actions de maintenance">
        <p className="text-xs text-muted-foreground">
          Les actions ci-dessous nécessitent un accès direct au serveur ou à la base de données.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li>Recalcul des embeddings RAG → <code className="rounded bg-muted px-1">npm run rag:reindex</code></li>
          <li>Purge des générations IA expirées → <code className="rounded bg-muted px-1">npm run purge:generations</code></li>
          <li>Export RGPD utilisateur → via l&apos;API <code className="rounded bg-muted px-1">PATCH /api/admin/users/[id]</code> action <code className="rounded bg-muted px-1">delete_rgpd</code></li>
        </ul>
      </Section>
    </main>
  );
}

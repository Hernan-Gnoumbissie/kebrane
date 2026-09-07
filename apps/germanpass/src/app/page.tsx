import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { OFFERS, ACTIVATION_STEPS } from "@/lib/pricing";
import { ContactForm } from "@/components/contact-form";

const PROVIDERS = ["Goethe", "ÖSD", "telc", "ECL", "TestDaF"] as const;

const SKILLS = [
  { de: "Lesen", fr: "Compréhension écrite", pct: 82 },
  { de: "Hören", fr: "Compréhension orale", pct: 76 },
  { de: "Schreiben", fr: "Expression écrite", pct: 68 },
  { de: "Sprechen", fr: "Expression orale", pct: 71 },
] as const;

const FEATURES = [
  {
    title: "Examens blancs chronométrés",
    desc: "Entraînez-vous en conditions réelles : sections séquentielles, temps limité, correction et rapport final par compétence.",
    icon: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
  },
  {
    title: "Correction IA & feedback utile",
    desc: "Schreiben et Sprechen corrigés erreur par erreur, avec niveau estimé et recommandations — en français et en allemand.",
    icon: <path d="M12 3l1.9 4.8L19 9.5l-4.1 2.9L16 18l-4-3-4 3 1.1-5.6L5 9.5l5.1-1.7L12 3z" />,
  },
  {
    title: "Plan de révision personnalisé",
    desc: "Le tableau de bord suit vos résultats et propose les prochaines actions selon vos points faibles.",
    icon: <path d="M3 3v18h18M7 15l3-3 3 3 5-6" />,
  },
  {
    title: "Allemand adapté au niveau",
    desc: "Cours et consignes en allemand niveaugerecht, avec une aide en français ou en anglais selon votre langue.",
    icon: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />,
  },
] as const;

const TESTIMONIALS = [
  { name: "Awa N.", role: "Objectif Goethe B1", text: "Les examens blancs chronométrés m'ont enlevé le stress du jour J. Le feedback sur mes Schreiben était précis et utile." },
  { name: "Karl M.", role: "Objectif telc B2", text: "Le plan de révision m'a fait travailler mes points faibles au lieu de réviser au hasard. J'ai vu mes scores monter." },
  { name: "Sophie T.", role: "Objectif ÖSD B1", text: "Importer ma copie manuscrite et recevoir une correction détaillée, c'est exactement ce qu'il me fallait." },
] as const;

const FAQ = [
  {
    q: "Est-ce une plateforme officielle Goethe, ÖSD, telc ou ECL ?",
    a: "Non. GermanPass est une plateforme indépendante. Elle respecte les structures publiques des examens sans reproduire aucun contenu officiel.",
  },
  {
    q: "Puis-je travailler uniquement mon examen cible ?",
    a: "Oui. Votre objectif d'examen et de niveau oriente les exercices, les examens blancs et les recommandations.",
  },
  {
    q: "C'est vraiment gratuit ?",
    a: "Oui. Cours, entraînements et examens blancs, sans limite de temps ni carte bancaire. Le Premium ne débloque que le feedback IA détaillé sur vos écrits et oraux.",
  },
] as const;

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* ── Header sticky ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Logo size="md" />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/pricing" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Tarifs
            </Link>
            <a href="#contact" className={buttonVariants({ variant: "ghost", size: "sm" }) + " hidden sm:inline-flex"}>
              Contact
            </a>
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Connexion
            </Link>
            <Link href="/register" className={buttonVariants({ size: "sm" })}>
              Créer un compte
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" aria-hidden="true" />
        <div className="container relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              🇩🇪 Goethe · ÖSD · telc · ECL · TestDaF — A1 à C2
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Préparez votre examen d&apos;allemand avec un vrai{" "}
              <span className="text-primary">plan de travail</span>.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Examens blancs, entraînements Lesen · Hören · Schreiben · Sprechen, correction par IA et
              statistiques de progression pour avancer vers votre objectif — feedback bilingue
              français / allemand.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Commencer gratuitement
              </Link>
              <Link href="/pricing" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Voir les tarifs
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Pensé pour les candidats francophones et anglophones · cours, entraînements et examens blancs gratuits, sans carte bancaire.
            </p>
          </div>

          {/* Aperçu produit */}
          <div className="rounded-2xl border bg-card p-6 shadow-2xl shadow-blue-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Examen blanc</p>
                <p className="font-semibold">Goethe-Zertifikat B1</p>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                Bestanden ✓
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {SKILLS.map((s) => (
                <div key={s.de}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      {s.de} <span className="text-muted-foreground">· {s.fr}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{s.pct} %</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${s.pct >= 60 ? "bg-primary" : "bg-amber-400"}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">Score global</span>
              <span className="text-lg font-bold text-primary">74 %</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bandeau organismes ── */}
      <section className="border-y bg-muted/30">
        <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Formats d&apos;examen couverts
          </span>
          {PROVIDERS.map((p) => (
            <span key={p} className="text-base font-bold text-foreground/70">{p}</span>
          ))}
        </div>
      </section>

      {/* ── Fonctionnalités ── */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ce qui aide vraiment à progresser</h2>
          <p className="mt-3 text-muted-foreground">
            Plus que des exercices : la plateforme organise le travail et transforme vos résultats en prochaines actions.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                <Icon>{f.icon}</Icon>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comment ça marche (parcours d'activation réel) ── */}
      <section className="border-y bg-muted/30">
        <div className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Un parcours clair jusqu&apos;à l&apos;accès</h2>
            <p className="mt-3 text-muted-foreground">
              L&apos;inscription crée votre compte ; l&apos;accès complet se débloque après validation du paiement.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {ACTIVATION_STEPS.map((step, i) => (
              <div key={i} className="rounded-2xl border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Aperçu tarifs ── */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Des formules simples</h2>
          <p className="mt-3 text-muted-foreground">Payez par Mobile Money ou PayPal. Choisissez la durée qui vous convient.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {OFFERS.map((o) => (
            <div
              key={o.days}
              className={`flex flex-col rounded-2xl border bg-card p-6 ${o.highlight ? "border-primary ring-1 ring-primary" : ""}`}
            >
              {o.highlight ? (
                <span className="mb-3 inline-block w-fit rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  Le plus choisi
                </span>
              ) : null}
              <h3 className="text-lg font-semibold">{o.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{o.days} jours d&apos;accès</p>
              <p className="mt-4 text-3xl font-extrabold">
                {o.priceXaf.toLocaleString("fr-FR")}
                <span className="ml-1 text-base font-medium text-muted-foreground">FCFA</span>
              </p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{o.description}</p>
              <Link
                href="/register"
                className={buttonVariants({ variant: o.highlight ? "default" : "outline", size: "sm" }) + " mt-6"}
              >
                Choisir
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Témoignages ── */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ils préparent leur examen avec GermanPass</h2>
          <p className="mt-3 inline-block rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            Exemples illustratifs — de vrais témoignages seront publiés dès nos premiers candidats.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-2xl border bg-card p-6">
              <blockquote className="flex-1 text-sm text-foreground/90">« {t.text} »</blockquote>
              <figcaption className="mt-4 text-sm font-semibold">
                {t.name} <span className="font-normal text-muted-foreground">· {t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-y bg-muted/30">
        <div className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Questions fréquentes</h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-2xl border bg-card p-6">
                <h3 className="font-semibold">{item.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="container scroll-mt-20 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Une question, un problème, une suggestion ?</h2>
          <p className="mt-3 text-muted-foreground">
            Écrivez-nous : nous lisons chaque message et nous nous en servons pour améliorer la plateforme.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <ContactForm />
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="container py-20">
        <div className="overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Prêt(e) à viser votre certificat ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Créez votre compte en quelques secondes et commencez votre première session dès aujourd&apos;hui.
          </p>
          <Link href="/register" className={buttonVariants({ size: "lg", variant: "secondary" }) + " mt-8"}>
            Commencer gratuitement
          </Link>
        </div>
      </section>

      {/* ── Footer légal ── */}
      <footer className="mt-auto border-t py-8">
        <div className="container space-y-2 text-center text-xs text-muted-foreground">
          <p className="font-medium">
            Plattform nicht mit Goethe-Institut, ÖSD, telc gGmbH oder ECL verbunden.
          </p>
          <p>
            Plateforme indépendante, non affiliée au Goethe-Institut, à l&apos;ÖSD, à telc gGmbH ni à
            ECL. Tout le contenu d&apos;entraînement est original ; seules les structures
            pédagogiques publiques des examens sont respectées.
          </p>
          <p>
            <Link className="underline" href="/legal">
              Mentions légales &amp; RGPD
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}

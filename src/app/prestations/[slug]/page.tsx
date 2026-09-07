import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Seam } from "@/components/seam";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { CATEGORY_LABELS, TELEPHONY_SERVICE_SLUGS, formatCents } from "@/lib/catalog";
import { getCatalog, getServiceBySlug } from "@/lib/get-catalog";
import { SERVICE_ICONS } from "@/lib/service-icons";

export async function generateStaticParams() {
  const services = await db.service.findMany({ select: { slug: true } });
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return {};
  return { title: service.name, description: service.description };
}

// Champ quasi universel (présent sur presque toutes les prestations) — ne
// distingue pas une prestation d'une autre, on l'omet de la liste "ce que
// vous configurez" pour ne garder que ce qui est propre à celle-ci.
const GENERIC_FIELD_KEYS = new Set(["companyName"]);

// Réponse à la question qu'un prospect se pose avant même d'activer une
// prestation de téléphonie : "dois-je changer de numéro ?" — voir aussi le
// guide interactif équivalent dans le tableau de bord une fois le numéro
// attribué (src/app/dashboard/call-forwarding-guide.tsx).
const PHONE_FORWARDING_STEPS = [
  {
    title: "Un numéro dédié à l'IA",
    description:
      "Dès l'activation, nous vous attribuons un numéro rien que pour cette solution.",
  },
  {
    title: "Un renvoi d'appel, gratuit et réversible",
    description:
      "Depuis votre ligne actuelle, vous activez un simple renvoi vers ce numéro — désactivable à tout moment.",
  },
  {
    title: "Vos clients ne voient aucun changement",
    description:
      "Ils composent le numéro qu'ils connaissent déjà ; l'IA prend le relais automatiquement.",
  },
];

export default async function PrestationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const [session, allServices] = await Promise.all([getSession(), getCatalog()]);
  const Icon = SERVICE_ICONS[service.slug] ?? Bot;
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(service.slug);
  const configFields = service.configFields.filter(
    (field) => !GENERIC_FIELD_KEYS.has(field.key)
  );
  const related = allServices
    .filter((s) => s.category === service.category && s.slug !== service.slug)
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-muted">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-primary/10 mask-repeat mask-size-[40px_1px] [mask-image:url(/stripes/stripes.svg)]"
          />
          <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <Link
              href="/#prestations"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Toutes les solutions
            </Link>

            <div className="mt-6 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-xs tracking-widest text-muted-foreground uppercase">
                {CATEGORY_LABELS[service.category]}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {service.name}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {service.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {session ? (
                <Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>
                  Aller à mon tableau de bord
                  <ArrowRight data-icon="inline-end" />
                </Button>
              ) : (
                <>
                  <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
                    Créer un compte
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/login" />}
                  >
                    Se connecter
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <Seam className="bg-primary/25" />

        <section className="bg-background py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <dl className="grid gap-4 sm:grid-cols-3">
              {service.setupFeeCents !== null && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <dt className="text-xs text-muted-foreground">Mise en place</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {formatCents(service.setupFeeCents)}
                  </dd>
                </div>
              )}
              {service.monthlyPriceCents !== null && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <dt className="text-xs text-muted-foreground">Abonnement</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {formatCents(service.monthlyPriceCents)}/mois
                  </dd>
                </div>
              )}
              {service.usageCapLabel && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <dt className="text-xs text-muted-foreground">Plafond d&apos;usage</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {service.usageCapLabel}
                  </dd>
                </div>
              )}
            </dl>

            {isTelephony && (
              <div className="mt-14">
                <span className="text-xs tracking-widest text-primary uppercase">
                  Numéro de téléphone
                </span>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-foreground">
                  Vous gardez votre numéro actuel
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  Aucune portabilité, aucune interruption de service : vos
                  clients continuent d&apos;appeler le numéro qu&apos;ils
                  connaissent déjà.
                </p>
                <ol className="mt-8 grid gap-6 sm:grid-cols-3">
                  {PHONE_FORWARDING_STEPS.map((step, index) => (
                    <li key={step.title} className="relative">
                      {index < PHONE_FORWARDING_STEPS.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute top-4 left-8 hidden h-px w-[calc(100%-2rem)] bg-border sm:block"
                        />
                      )}
                      <span className="relative flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                        {index + 1}
                      </span>
                      <h3 className="mt-4 font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {configFields.length > 0 && (
              <div className="mt-14">
                <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
                  Ce que vous configurez à l&apos;activation
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  L&apos;équipe Noveris installe et connecte la solution —
                  voici les informations qu&apos;on vous demande pour la
                  personnaliser à votre activité.
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {configFields.map((field) => (
                    <li
                      key={field.key}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <p className="font-medium text-foreground">{field.label}</p>
                      {field.helpText && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {field.helpText}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {related.length > 0 && (
          <section className="border-t border-border bg-muted py-16 sm:py-20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Autres solutions — {CATEGORY_LABELS[service.category]}
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {related.map((relatedService) => {
                  const RelatedIcon = SERVICE_ICONS[relatedService.slug] ?? Bot;
                  return (
                    <Link
                      key={relatedService.slug}
                      href={`/prestations/${relatedService.slug}`}
                      className="block text-inherit no-underline"
                    >
                      <Card className="h-full transition-colors hover:bg-card/70">
                        <CardHeader>
                          <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <RelatedIcon className="size-4" aria-hidden="true" />
                          </span>
                          <CardTitle className="text-base">
                            {relatedService.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {relatedService.description}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JsonLd, priceSummary, serviceSchema } from "@/components/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { Seam } from "@/components/seam";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSession } from "@/lib/session";
import { CATEGORY_LABELS, TELEPHONY_SERVICE_SLUGS, formatCents } from "@/lib/catalog";
import { getCatalog, getServiceBySlug } from "@/lib/get-catalog";
import { SERVICE_ICONS } from "@/lib/service-icons";

// Pas de generateStaticParams ici : la page lit la session, donc les
// en-têtes de la requête, et ne peut pas être rendue à l'avance. La déclarer
// n'accélérait rien et cassait le déploiement sur une base vide — sans
// paramètre à prérendre, Next ne rend jamais la page au build, ne voit donc
// pas l'appel dynamique, classe la route en statique, et chaque page de
// solution répondait alors 500 (« Page changed from static to dynamic at
// runtime, reason: headers »).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return {};
  // Le prix figure dans la description partagée : c'est la première chose
  // qu'un prospect cherche, et un aperçu qui l'omet le fait cliquer pour
  // rien.
  const description = `${service.description} ${priceSummary(service)}`;
  const url = `/prestations/${service.slug}`;
  return {
    title: service.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: service.name, description, url },
    twitter: { card: "summary_large_image", title: service.name, description },
  };
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
      <JsonLd data={serviceSchema(service)} />
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
              {/* Badge plutôt qu'un libellé en capitales espacées : les
                  majuscules suppriment la silhouette des mots et se lisent
                  plus difficilement, pour un gain visuel nul ici. */}
              <Badge variant="secondary">{CATEGORY_LABELS[service.category]}</Badge>
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {service.name}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {service.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {session ? (
                <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                  Aller à mon tableau de bord
                  <ArrowRight data-icon="inline-end" />
                </Link>
              ) : (
                <>
                  <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                    Créer mon compte
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                  <Link
                    href="/login"
                    className={buttonVariants({ size: "lg", variant: "outline" })}
                  >
                    Se connecter
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <Seam className="bg-primary/25" />

        <section
          aria-labelledby="tarif-heading"
          className="bg-background py-16 sm:py-20"
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            {/* Le tarif n'avait aucun titre : trois montants isolés, ni
                annoncés dans le sommaire des titres pour un lecteur
                d'écran, ni résumés pour qui veut juste savoir ce qu'il
                paie. */}
            <h2
              id="tarif-heading"
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              Tarif
            </h2>
            <p className="mt-2 text-muted-foreground">
              {/* La même phrase que dans l'aperçu de partage : le prix
                  annoncé au clic doit être celui qu'on lit en arrivant. */}
              {priceSummary(service)} Sans engagement.
            </p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
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
                <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
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
          <section
            aria-labelledby="related-heading"
            className="border-t border-border bg-muted py-16 sm:py-20"
          >
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <h2
                id="related-heading"
                className="text-2xl font-semibold tracking-tight text-foreground"
              >
                Autres solutions en {CATEGORY_LABELS[service.category].toLowerCase()}
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {related.map((relatedService) => {
                  const RelatedIcon = SERVICE_ICONS[relatedService.slug] ?? Bot;
                  return (
                    // Lien "étiré" plutôt qu'un <Link> englobant toute la
                    // carte : englober l'icône et la description les faisait
                    // avaler par le nom accessible du lien, qu'un lecteur
                    // d'écran énonce alors en entier. Même motif que
                    // MyServiceRow dans le tableau de bord.
                    <Card
                      key={relatedService.slug}
                      className="relative h-full transition-colors has-[a:hover]:bg-card/70 has-[a:focus-visible]:bg-card/70 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/30"
                    >
                      <CardHeader>
                        <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <RelatedIcon className="size-4" aria-hidden="true" />
                        </span>
                        {/* Un vrai <h3> plutôt que CardTitle, qui rend un
                            <div> : ces cartes n'apparaissaient pas dans le
                            sommaire des titres. */}
                        <h3 className="font-heading text-base font-medium">
                          <Link
                            href={`/prestations/${relatedService.slug}`}
                            className="text-inherit no-underline outline-none after:absolute after:inset-0"
                          >
                            {relatedService.name}
                          </Link>
                        </h3>
                        <CardDescription className="line-clamp-2">
                          {relatedService.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* La page s'achevait sur les autres solutions : après avoir lu le
            tarif et le fonctionnement, un visiteur convaincu n'avait aucun
            moyen d'agir sans remonter en haut. */}
        <section
          aria-labelledby="cta-heading"
          className="border-t border-border bg-background py-16 sm:py-20"
        >
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2
              id="cta-heading"
              className="text-2xl font-semibold tracking-tight text-balance text-foreground"
            >
              {session
                ? `Activez « ${service.name} » depuis votre tableau de bord`
                : `Prêt à activer « ${service.name} » ?`}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Notre équipe l&apos;installe, la connecte à vos outils et la
              surveille chaque mois.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={session ? "/dashboard/prestations" : "/signup"}
                className={buttonVariants({ size: "lg" })}
              >
                {session ? "Choisir cette solution" : "Créer mon compte"}
                <ArrowRight data-icon="inline-end" />
              </Link>
              <Link
                href="/contact"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Poser une question
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

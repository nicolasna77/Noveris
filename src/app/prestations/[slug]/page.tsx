import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot } from "lucide-react";
import { JsonLd, priceSummary, serviceSchema } from "@/components/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
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
        {/* Le tarif est la première question d'un artisan : il remonte
            dans le hero, à droite, au lieu d'attendre sous le pli dans trois
            cartes identiques. C'est aussi ce qui donne au hero son point
            d'appui — le fond à rayures ne faisait que masquer son absence. */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <Link
              href="/#prestations"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Toutes les solutions
            </Link>

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
              <div>
                {/* La catégorie en texte simple, pas en pastille : une
                    pastille grise à côté du bloc d'icône faisait deux marques
                    concurrentes au même endroit. Et pas de capitales
                    espacées — elles suppriment la silhouette des mots pour un
                    gain visuel nul. */}
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {CATEGORY_LABELS[service.category]}
                  </span>
                </div>

                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
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
                        className={buttonVariants({ size: "lg", variant: "secondary" })}
                      >
                        Se connecter
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <aside
                aria-labelledby="tarif-heading"
                className="rounded-xl border border-border bg-card p-6 lg:self-start"
              >
                <h2 id="tarif-heading" className="text-sm font-medium text-muted-foreground">
                  Tarif
                </h2>

                <dl className="mt-4 divide-y divide-border">
                  {service.setupFeeCents !== null && (
                    <div className="pb-4">
                      <dd className="text-3xl font-semibold tabular-nums text-foreground">
                        {formatCents(service.setupFeeCents)}
                      </dd>
                      <dt className="mt-0.5 text-sm text-muted-foreground">
                        &agrave; l&apos;installation
                      </dt>
                    </div>
                  )}
                  {service.monthlyPriceCents !== null && (
                    <div className="py-4 first:pt-0">
                      {/* Volontairement pas en violet : sur la carte sombre du
                          thème, le primaire tombe à environ 2:1, sous le
                          minimum de 3:1 exigé pour du grand texte. Le panneau
                          se distingue déjà par sa place et sa taille — la
                          couleur n'y ajoutait rien qu'un risque de lisibilité. */}
                      <dd className="text-3xl font-semibold tabular-nums text-foreground">
                        {formatCents(service.monthlyPriceCents)}
                      </dd>
                      <dt className="mt-0.5 text-sm text-muted-foreground">par mois</dt>
                    </div>
                  )}
                  {service.usageCapLabel && (
                    <div className="py-4">
                      <dt className="text-sm text-muted-foreground">Compris</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {service.usageCapLabel}
                      </dd>
                    </div>
                  )}
                </dl>

                <p className="border-t border-border pt-4 text-sm text-muted-foreground">
                  Sans engagement, r&eacute;siliable &agrave; tout moment.
                </p>
              </aside>
            </div>
          </div>
        </section>

        {isTelephony && (
          <section aria-labelledby="numero-heading" className="border-b border-border">
            <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
              <h2
                id="numero-heading"
                className="text-2xl font-semibold tracking-tight text-balance text-foreground"
              >
                Vous gardez votre num&eacute;ro actuel
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
                Aucune portabilit&eacute;, aucune interruption de service : vos
                clients continuent d&apos;appeler le num&eacute;ro qu&apos;ils
                connaissent d&eacute;j&agrave;.
              </p>
              {/* Une numérotation, parce que c'est une vraie séquence : chaque
                  étape suppose la précédente. */}
              <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
                {PHONE_FORWARDING_STEPS.map((step, index) => (
                  <li key={step.title} className="border-t border-border pt-4">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <h3 className="mt-2 font-medium text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {configFields.length > 0 && (
          <section aria-labelledby="config-heading" className="border-b border-border">
            <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
              <h2
                id="config-heading"
                className="text-2xl font-semibold tracking-tight text-balance text-foreground"
              >
                Ce que vous configurez &agrave; l&apos;activation
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
                L&apos;&eacute;quipe Noveris installe et connecte la solution —
                voici les informations qu&apos;on vous demande pour la
                personnaliser &agrave; votre activit&eacute;.
              </p>
              {/* Une liste à filets plutôt que des cartes : ce sont des
                  informations à lire, pas des objets à choisir. */}
              <dl className="mt-10 grid gap-x-12 sm:grid-cols-2">
                {configFields.map((field) => (
                  <div key={field.key} className="border-t border-border py-4">
                    <dt className="font-medium text-foreground">{field.label}</dt>
                    {field.helpText && (
                      <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {field.helpText}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section
            aria-labelledby="related-heading"
            className="border-b border-border"
          >
            <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
              <h2
                id="related-heading"
                className="text-2xl font-semibold tracking-tight text-foreground"
              >
                Autres solutions en {CATEGORY_LABELS[service.category].toLowerCase()}
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
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
          className="bg-muted/40"
        >
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2
              id="cta-heading"
              className="text-2xl font-semibold tracking-tight text-balance text-foreground"
            >
              {session
                ? `Activez « ${service.name} » depuis votre tableau de bord`
                : `Prêt à activer « ${service.name} » ?`}
            </h2>
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              Notre équipe l&apos;installe, la connecte à vos outils et la
              surveille chaque mois.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={session ? "/dashboard/prestations" : "/signup"}
                className={buttonVariants({ size: "lg" })}
              >
                {session ? "Choisir cette solution" : "Créer mon compte"}
                <ArrowRight data-icon="inline-end" />
              </Link>
              <Link
                href="/contact"
                className={buttonVariants({ size: "lg", variant: "secondary" })}
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

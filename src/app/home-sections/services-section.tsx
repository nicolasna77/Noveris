import Link from "next/link";
import { Bot, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  formatCents,
  type ServiceCategory,
  type ServiceDTO,
} from "@/lib/catalog";
import { SERVICE_ICONS } from "@/lib/service-icons";

const SERVICE_SECTION_CATEGORIES: ServiceCategory[] = [
  "COMMUNICATION",
  "INFORMATION",
];

function ServiceCard({ service }: { service: ServiceDTO }) {
  const Icon = SERVICE_ICONS[service.slug] ?? Bot;
  return (
    <Link
      href={`/prestations/${service.slug}`}
      id={service.slug}
      className="block scroll-mt-20 text-inherit no-underline outline-none"
    >
      <Card className="h-full transition-colors hover:bg-muted/40 focus-visible:bg-muted/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <ChevronRight
              className="mt-1 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <CardTitle>{service.name}</CardTitle>
          <CardDescription>{service.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1.5 border-t border-border pt-4 text-xs">
            {service.setupFeeCents !== null && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Mise en place</dt>
                <dd className="tabular-nums text-foreground">
                  {formatCents(service.setupFeeCents)}
                </dd>
              </div>
            )}
            {service.monthlyPriceCents !== null && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Abonnement</dt>
                <dd className="tabular-nums text-foreground">
                  {formatCents(service.monthlyPriceCents)}/mois
                </dd>
              </div>
            )}
            {service.usageCapLabel && (
              <div className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                {service.usageCapLabel}
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ServicesSection({ services }: { services: ServiceDTO[] }) {
  return (
    <section id="prestations" className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {SERVICE_SECTION_CATEGORIES.map((category, index) => (
          <div key={category} className={index > 0 ? "mt-16" : undefined}>
            <div className="mb-6 flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-1 h-6 w-1 shrink-0 rounded-full bg-primary"
              />
              <div className="max-w-2xl">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {CATEGORY_LABELS[category]}
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.filter((s) => s.category === category).map((service) => (
                <ServiceCard key={service.slug} service={service} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

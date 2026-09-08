import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="border-t border-border bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Prêt à reprendre ces heures perdues chaque semaine ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Créez votre compte, choisissez vos automatisations et laissez notre
          équipe s&apos;occuper de l&apos;installation.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
              Créer mon compte
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/contact" />}
            >
              Parler à un conseiller
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Garantie 30 jours, sans engagement.
          </p>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight, Banknote, FileClock, PhoneMissed } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PROBLEMS = [
  {
    icon: PhoneMissed,
    title: "Un appel manqué, un client perdu",
    description:
      "Vous êtes sur un chantier ou avec un client : le téléphone sonne dans le vide, et personne ne rappelle à votre place.",
  },
  {
    icon: FileClock,
    title: "Les devis traînent, la trésorerie attend",
    description:
      "Rédiger un devis ou une facture le soir, après une journée de travail, retarde chaque encaissement d'une semaine de plus.",
  },
  {
    icon: Banknote,
    title: "Les impayés s'accumulent sans relance",
    description:
      "Sans suivi systématique, une facture oubliée devient très vite une facture qu'on ne réclame plus jamais.",
  },
];

export function ProblemSection() {
  return (
    <section className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            Chaque tâche répétitive vous coûte du temps que vous ne facturez
            pas
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Trois symptômes que presque tous nos clients reconnaissent avant
            de nous appeler.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <Card key={problem.title} className="h-full">
              <CardHeader>
                <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                  <problem.icon className="size-4" />
                </span>
                <CardTitle>
                  {problem.title}
                </CardTitle>
                <CardDescription>{problem.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-border bg-muted/40 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-lg font-medium text-balance text-foreground">
            Ces trois-là, une automatisation s&apos;en charge sans que vous y
            pensiez.
          </p>
          <Link
            href="#prestations"
            className={cn(buttonVariants(), "shrink-0")}
          >
            Voir les solutions
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
      </div>
    </section>
  );
}

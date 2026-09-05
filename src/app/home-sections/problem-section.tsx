import Link from "next/link";
import { Banknote, FileClock, PhoneMissed } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <section className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-xs tracking-widest text-primary uppercase">
            Le quotidien que vous connaissez
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
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
        <p className="mt-10 text-lg font-medium text-foreground">
          C&apos;est exactement ce que Noveris automatise pour vous.{" "}
          <Link
            href="#prestations"
            className="text-primary underline-offset-4 hover:underline"
          >
            Voir les prestations
          </Link>
        </p>
      </div>
    </section>
  );
}

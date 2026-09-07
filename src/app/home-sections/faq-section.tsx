import Link from "next/link";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "Dois-je savoir configurer un outil ou une API ?",
    answer:
      "Non. Notre équipe installe, connecte et vérifie chaque automatisation à votre place. Vous n'ouvrez aucun logiciel technique.",
  },
  {
    question: "Combien de temps avant que ce soit actif ?",
    answer:
      "La plupart des solutions sont déployées et vérifiées en quelques jours après l'audit initial.",
  },
  {
    question: "Je peux arrêter quand je veux ?",
    answer:
      "Oui, aucun engagement de durée. Et vous êtes remboursé si vous n'êtes pas satisfait dans les 30 premiers jours.",
  },
  {
    question: "Et si j'ai déjà un agenda ou un outil de facturation ?",
    answer:
      "Nous connectons vos automatisations à vos outils existants plutôt que de vous en imposer de nouveaux.",
  },
  {
    question: "Mes données sont-elles en sécurité ?",
    answer:
      "Vos données restent liées à vos outils existants. Nous ne les revendons ni ne les partageons avec des tiers.",
  },
];

export function FaqSection() {
  return (
    <section className="bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="text-xs tracking-widest text-primary uppercase">
            Questions fréquentes
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ce que nos clients demandent avant de se lancer
          </h2>
        </div>
        <div className="mt-10 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Votre question n&apos;est pas là ?{" "}
          <Link
            href="/contact"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Écrivez-nous
          </Link>
          , on répond sous 24h ouvrées.
        </p>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { FAQS } from "@/lib/site";


export function FaqSection() {
  return (
    <section className="bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
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
        <p className="mt-6 text-sm text-foreground">
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

import { CalendarCheck, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

// Ce que fait le produit, montré plutôt que décrit : un appel décroché par
// l'assistant pendant que l'artisan a les mains prises, jusqu'au rendez-vous
// posé dans son agenda. C'est un exemple construit, pas la transcription d'un
// vrai client — la légende le dit, pour que rien ici ne passe pour une preuve.
//
// C'est aussi le seul mouvement de la page : les répliques arrivent une à une
// au chargement, puis la confirmation. Avec « réduire les animations », tout
// est affiché d'emblée (les classes d'animation sont préfixées motion-safe).

const LINES: { from: "client" | "assistant"; text: string }[] = [
  {
    from: "client",
    text: "Bonjour, j'ai une fuite sous l'évier. Vous pouvez passer cette semaine ?",
  },
  {
    from: "assistant",
    text: "Bien sûr. Je peux vous proposer jeudi à 14 h ou vendredi à 9 h.",
  },
  { from: "client", text: "Jeudi 14 h, parfait." },
  { from: "assistant", text: "C'est noté : jeudi à 14 h. À jeudi !" },
];

const FIRST_DELAY_S = 0.5;
const STEP_S = 0.9;

const reveal = "motion-safe:opacity-0 motion-safe:animate-[hero-line-in_0.45s_ease-out_forwards]";

export function HeroCallDemo() {
  return (
    <figure className="w-full">
      {/* Les jetons sombres du thème, sur ce seul bloc : c'est un écran,
          pas une section de page. */}
      <div className="dark">
        <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary-foreground">
              <Phone className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Appel décroché par l&apos;assistant</p>
              <p className="font-mono text-xs text-muted-foreground">06 •• •• •• 78</p>
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">00:42</span>
          </div>

          <ol className="space-y-3 px-5 py-5" aria-label="Transcription de l'appel">
            {LINES.map((line, index) => (
              <li
                key={index}
                className={cn("flex", line.from === "assistant" && "justify-end", reveal)}
                style={{ animationDelay: `${FIRST_DELAY_S + index * STEP_S}s` }}
              >
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug",
                    line.from === "assistant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <span className="sr-only">
                    {line.from === "assistant" ? "Assistant : " : "Client : "}
                  </span>
                  {line.text}
                </p>
              </li>
            ))}
          </ol>

          <div
            className={cn(
              "flex items-center gap-2.5 border-t border-border px-5 py-4 text-sm",
              reveal
            )}
            style={{ animationDelay: `${FIRST_DELAY_S + LINES.length * STEP_S}s` }}
          >
            <CalendarCheck className="size-4 shrink-0 text-primary-foreground" aria-hidden="true" />
            <span className="flex-1">Rendez-vous ajouté à votre agenda Google</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">jeu. 14:00</span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        Exemple : un appel reçu pendant que vous êtes sur un chantier.
      </figcaption>
    </figure>
  );
}

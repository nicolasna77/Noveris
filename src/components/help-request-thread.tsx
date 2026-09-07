import { cn } from "@/lib/utils";
import type { HelpRequestMessageDTO } from "@/lib/help";

function formatMessageDate(date: Date): string {
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fil d'une demande d'aide, affiché à l'identique côté client
// (/dashboard/aide) et côté équipe (/admin/aide) — seule la façon d'y
// répondre change, d'où deux formulaires distincts qui appellent chacun
// leur propre action. Les messages de l'équipe sont décalés visuellement
// pour distinguer les deux voix d'un coup d'œil, sans dépendre de la seule
// couleur (le libellé d'auteur porte déjà l'information).
export function HelpRequestThread({
  messages,
}: {
  messages: HelpRequestMessageDTO[];
}) {
  if (messages.length === 0) return null;

  return (
    <ol className="mt-4 space-y-3 border-t border-border pt-4">
      {messages.map((message) => (
        <li
          key={message.id}
          className={cn(
            "rounded-2xl border p-3 text-sm",
            message.fromTeam
              ? "border-primary/20 bg-primary/5"
              : "border-border bg-card sm:ml-8"
          )}
        >
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-xs font-medium text-foreground">
              {message.fromTeam ? `${message.authorName} · Noveris` : message.authorName}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatMessageDate(message.createdAt)}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-foreground">{message.body}</p>
        </li>
      ))}
    </ol>
  );
}

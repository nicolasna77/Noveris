import { Check, X } from "lucide-react";
import {
  FACEBOOK_SERVICE_SLUG,
  INSTAGRAM_SERVICE_SLUG,
  TELEPHONY_SERVICE_SLUGS,
  WHATSAPP_SERVICE_SLUG,
  asStringArray,
  type MyServiceDTO,
} from "@/lib/catalog";

// L'état des comptes tiers, en lecture seule. Côté client, chaque ligne est
// un bouton pour connecter ou déconnecter ; ici, seulement le constat.
//
// C'est souvent la réponse à « pourquoi ça ne marche pas chez moi » : une
// solution active dont le compte n'est pas connecté ne reçoit rien, et
// l'équipe n'avait aucun moyen de le vérifier sans le demander au client.
export function ConnectionSummary({ item }: { item: MyServiceDTO }) {
  const rows: { label: string; connected: boolean; detail: string | null }[] = [];

  if (item.service.slug === WHATSAPP_SERVICE_SLUG) {
    rows.push({
      label: "Compte WhatsApp",
      connected: item.whatsappConnected,
      detail: item.whatsappDisplayNumber,
    });
  }
  if (item.service.slug === FACEBOOK_SERVICE_SLUG) {
    rows.push({
      label: "Page Facebook",
      connected: item.facebookConnected,
      detail: item.facebookPageName,
    });
  }
  if (item.service.slug === INSTAGRAM_SERVICE_SLUG) {
    rows.push({
      label: "Compte Instagram",
      connected: item.instagramConnected,
      detail: item.instagramUsername,
    });
  }
  // L'agenda ne concerne que les solutions téléphoniques dont le client a
  // coché la prise de rendez-vous : ailleurs, l'absence de connexion n'est
  // pas une anomalie et l'afficher serait trompeur.
  if (
    TELEPHONY_SERVICE_SLUGS.has(item.service.slug) &&
    asStringArray(item.configuration.objectives).includes("appointment")
  ) {
    rows.push({
      label: "Agenda Google",
      connected: item.calendarConnected,
      detail: null,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-foreground">Connexions</h3>
      <ul className="text-sm">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center gap-2 border-b border-border py-2 last:border-b-0"
          >
            {row.connected ? (
              <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <X className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="text-muted-foreground">{row.label}</span>
            <span className="ml-auto text-foreground">
              {row.connected ? (row.detail ?? "connecté") : "non connecté"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

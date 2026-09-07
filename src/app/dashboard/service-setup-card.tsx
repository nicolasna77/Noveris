import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  asStringArray,
  needsCalendarConnection,
  needsPhoneNumber,
  TELEPHONY_SERVICE_SLUGS,
  type MyServiceDTO,
} from "@/lib/catalog";
import { CalendarConnection } from "./calendar-connection";
import { PhoneNumberPurchase } from "./phone-number-purchase";

// Ce qui manque pour que la solution fonctionne vraiment, et à qui d'agir.
// Sans ça, un client dont le standard téléphonique n'a pas encore de numéro
// voit une page qui décrit un état sans jamais dire que l'IA ne peut pas
// encore décrocher — l'achat du numéro n'était qu'un bouton parmi les
// réglages. La carte disparaît d'elle-même une fois tout en place.
export function ServiceSetupCard({ item }: { item: MyServiceDTO }) {
  if (item.status === "CANCELED") return null;

  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(item.service.slug);
  const takesAppointments = asStringArray(
    item.configuration.objectives
  ).includes("appointment");

  const paid = item.status !== "PENDING_PAYMENT";
  const hasNumber = Boolean(item.externalPhoneNumber);
  const verified = item.status === "ACTIVE";

  const phoneDone = !isTelephony || hasNumber;
  const calendarDone = !takesAppointments || item.calendarConnected;
  if (paid && phoneDone && calendarDone && verified) return null;

  const steps = [
    { label: "Paiement", done: paid },
    ...(isTelephony
      ? [{ label: "Numéro de téléphone attribué", done: hasNumber }]
      : []),
    ...(takesAppointments
      ? [{ label: "Agenda connecté", done: item.calendarConnected }]
      : []),
    { label: "Vérification par l'équipe Noveris", done: verified },
  ];

  const nextIsPhone = needsPhoneNumber(item);
  const nextIsCalendar = !nextIsPhone && needsCalendarConnection(item);
  const waitingOnNoveris = paid && phoneDone && calendarDone && !verified;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mise en service</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-2">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  step.done
                    ? "bg-primary text-primary-foreground"
                    : "border border-dashed border-border"
                )}
              >
                {step.done && <Check className="size-3" />}
              </span>
              <span
                className={cn(
                  step.done ? "text-muted-foreground" : "font-medium text-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        {!paid && (
          <p className="text-sm text-muted-foreground">
            Finalisez le paiement pour lancer la mise en service — le bouton se
            trouve en haut de cette page.
          </p>
        )}

        {nextIsPhone && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Choisissez le numéro qui recevra vos appels
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              L&apos;IA ne peut pas encore décrocher tant qu&apos;aucun numéro
              n&apos;est attribué. Vous pourrez ensuite y renvoyer votre ligne
              actuelle, sans changer de numéro.
            </p>
            <PhoneNumberPurchase clientServiceId={item.clientServiceId} />
          </div>
        )}

        {nextIsCalendar && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Connectez votre agenda
            </p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              Les rendez-vous pris par téléphone s&apos;ajouteront directement
              dans votre Google Agenda.
            </p>
            <CalendarConnection
              clientServiceId={item.clientServiceId}
              connected={item.calendarConnected}
            />
          </div>
        )}

        {waitingOnNoveris && (
          <p className="text-sm text-muted-foreground">
            Rien à faire de votre côté : l&apos;équipe Noveris termine la mise
            en service et vous prévient dès que votre solution est active.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

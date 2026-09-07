import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  asStringArray,
  formatConfigValue,
  TELEPHONY_SERVICE_SLUGS,
  type MyServiceDTO,
} from "@/lib/catalog";
import { CalendarConnection } from "./calendar-connection";
import { CallActivity } from "./call-activity";
import { CallForwardingGuide } from "./call-forwarding-guide";
import { ConfigureButton } from "./configure-button";
import { UsageCounter } from "./usage-counter";

// Libellé à gauche, valeur à gauche juste en dessous (ou en colonne sur
// écran large) : une valeur longue — des horaires sur sept jours, un menu de
// produits — reste lisible, là où un alignement à droite la faisait revenir
// à la ligne en escalier.
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-border py-3 text-sm last:border-b-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

// Ordonné par urgence : ce qui se passe maintenant (appels en direct) avant
// ce qui est fixé une fois pour toutes (configuration). Ce qui reste à faire
// pour que la solution fonctionne vit dans ServiceSetupCard, au-dessus.
export function ServiceDetailTable({ item }: { item: MyServiceDTO }) {
  const configEntries = Object.entries(item.configuration).filter(
    ([, value]) => value
  );
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(item.service.slug);
  const isLive =
    isTelephony && (item.status === "ACTIVE" || item.status === "CONFIGURING");
  const takesAppointments = asStringArray(
    item.configuration.objectives
  ).includes("appointment");
  const canEditConfig =
    (item.status === "ACTIVE" || item.status === "CONFIGURING") &&
    item.service.configFields.length > 0;
  const showCalendarRow = isLive && takesAppointments && item.calendarConnected;
  const hasFacts =
    item.service.usageCapLabel ||
    (item.externalPhoneNumber && !isLive) ||
    configEntries.length > 0;

  return (
    <div className="space-y-6">
      {item.adminNote && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-medium text-primary">
            Note de l&apos;équipe Noveris
          </p>
          <p className="mt-1 text-sm text-foreground">{item.adminNote}</p>
        </div>
      )}

      {isLive && item.externalPhoneNumber && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">En direct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageCounter clientServiceId={item.clientServiceId} />
            <CallActivity clientServiceId={item.clientServiceId} />
          </CardContent>
        </Card>
      )}

      {isLive && item.externalPhoneNumber && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recevoir vos appels</CardTitle>
          </CardHeader>
          <CardContent>
            <CallForwardingGuide targetNumber={item.externalPhoneNumber} />
          </CardContent>
        </Card>
      )}

      {(hasFacts || showCalendarRow || canEditConfig) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Configuration</CardTitle>
            {canEditConfig && <ConfigureButton item={item} />}
          </CardHeader>
          <CardContent className="space-y-5">
            {!hasFacts && (
              <p className="text-sm text-muted-foreground">
                Aucun réglage renseigné pour l&apos;instant.
              </p>
            )}
            {hasFacts && (
              <dl>
                {item.service.usageCapLabel && (
                  <Fact label="Plafond d'usage">
                    {item.service.usageCapLabel}
                  </Fact>
                )}
                {item.externalPhoneNumber && !isLive && (
                  <Fact label="Numéro de téléphone">
                    <span className="tabular-nums">
                      {item.externalPhoneNumber}
                    </span>
                  </Fact>
                )}
                {configEntries.map(([key, value]) => {
                  const field = item.service.configFields.find(
                    (f) => f.key === key
                  );
                  const displayValue =
                    field?.type === "select" && typeof value === "string"
                      ? (field.options?.find((o) => o.value === value)?.label ??
                        value)
                      : formatConfigValue(value);
                  return (
                    <Fact key={key} label={field?.label ?? key}>
                      {displayValue}
                    </Fact>
                  );
                })}
              </dl>
            )}

            {showCalendarRow && (
              <CalendarConnection
                clientServiceId={item.clientServiceId}
                connected={item.calendarConnected}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

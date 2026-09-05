import {
  formatConfigValue,
  TELEPHONY_SERVICE_SLUGS,
  type MyServiceDTO,
} from "@/lib/catalog";
import { CalendarConnection } from "./calendar-connection";
import { BookingsList } from "./bookings-list";
import { CallActivity } from "./call-activity";
import { PhoneNumberPurchase } from "./phone-number-purchase";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2.5 text-sm last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{children}</dd>
    </div>
  );
}

export function ServiceDetailTable({ item }: { item: MyServiceDTO }) {
  const configEntries = Object.entries(item.configuration).filter(
    ([, value]) => value
  );
  const isTelephony = TELEPHONY_SERVICE_SLUGS.has(item.service.slug);
  const objectives = item.configuration.objectives;
  const takesAppointments =
    Array.isArray(objectives) &&
    (objectives as unknown[]).includes("appointment");
  const takesOrders =
    Array.isArray(objectives) && (objectives as unknown[]).includes("order");
  const hasFacts =
    item.service.usageCapLabel || item.externalPhoneNumber || configEntries.length > 0;

  return (
    <div className="space-y-8">
      {item.adminNote && (
        <div className="rounded-2xl bg-muted p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Note de l&apos;équipe Noveris
          </p>
          <p className="mt-1 text-sm text-foreground">{item.adminNote}</p>
        </div>
      )}

      {hasFacts && (
        <section aria-labelledby="service-facts-heading">
          <h2
            id="service-facts-heading"
            className="text-lg font-semibold text-foreground"
          >
            Détails
          </h2>
          <dl className="mt-4">
            {item.service.usageCapLabel && (
              <Fact label="Plafond d'usage">{item.service.usageCapLabel}</Fact>
            )}
            {item.externalPhoneNumber && (
              <Fact label="Numéro de téléphone">
                <span className="tabular-nums">
                  {item.externalPhoneNumber}
                </span>
              </Fact>
            )}
            {configEntries.map(([key, value]) => {
              const field = item.service.configFields.find((f) => f.key === key);
              const displayValue =
                field?.type === "select" && typeof value === "string"
                  ? (field.options?.find((o) => o.value === value)?.label ?? value)
                  : formatConfigValue(value);
              return (
                <Fact key={key} label={field?.label ?? key}>
                  {displayValue}
                </Fact>
              );
            })}
          </dl>
        </section>
      )}

      {isTelephony && (item.status === "ACTIVE" || item.status === "CONFIGURING") && (
        <div className="space-y-6">
          {!item.externalPhoneNumber && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Numéro de téléphone
              </h3>
              <PhoneNumberPurchase clientServiceId={item.clientServiceId} />
            </div>
          )}
          {takesAppointments && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Agenda
              </h3>
              <CalendarConnection
                clientServiceId={item.clientServiceId}
                connected={item.calendarConnected}
              />
            </div>
          )}
          {item.externalPhoneNumber && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Appels
              </h3>
              <CallActivity clientServiceId={item.clientServiceId} />
            </div>
          )}
          {(takesAppointments || takesOrders) && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Rendez-vous et commandes reçus
              </h3>
              <BookingsList bookings={item.bookings} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

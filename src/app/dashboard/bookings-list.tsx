import { CalendarCheck, ShoppingBag } from "lucide-react";
import { formatDate, type BookingDTO } from "@/lib/catalog";

const KIND_LABELS: Record<string, string> = {
  appointment: "Rendez-vous",
  order: "Commande",
};

export function BookingsList({ bookings }: { bookings: BookingDTO[] }) {
  if (bookings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun rendez-vous ni commande pris par téléphone pour l&apos;instant.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {bookings.map((booking) => {
        const Icon = booking.kind === "order" ? ShoppingBag : CalendarCheck;
        return (
          <li
            key={booking.id}
            className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-3 text-sm"
          >
            <Icon
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {KIND_LABELS[booking.kind] ?? booking.kind} —{" "}
                {booking.customerName}
              </p>
              <p className="text-xs text-muted-foreground">
                {booking.customerPhone}
                {booking.startAt && ` · ${formatDate(booking.startAt)}`}
                {!booking.googleEventId && booking.kind === "appointment" && (
                  <span className="text-destructive">
                    {" "}
                    · non synchronisé à l&apos;agenda
                  </span>
                )}
              </p>
              {booking.notes && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {booking.notes}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

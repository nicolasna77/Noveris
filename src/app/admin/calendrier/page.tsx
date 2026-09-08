import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { calendarWindow, toCalendarBookings } from "@/lib/bookings";
import { BookingsCalendar } from "@/components/bookings-calendar";

export const metadata: Metadata = { title: "Calendrier" };

export default async function AdminCalendrierPage() {
  await requireAdmin();

  // Tous les rendez-vous, tous clients confondus — à la différence du
  // calendrier de la page d'un utilisateur, scopé à un seul client.
  const bookings = await db.booking.findMany({
    where: { OR: [{ startAt: calendarWindow() }, { startAt: null }] },
    include: {
      clientService: {
        include: { service: true, organization: true, calendarConnection: true },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const { scheduled, unscheduled } = toCalendarBookings(bookings, {
    subtitle: (b) =>
      `${b.clientService.organization.name} · ${b.clientService.service.name}`,
    isSynced: (b) => !b.clientService.calendarConnection || Boolean(b.googleEventId),
  });

  // Même mise en page pleine hauteur que le calendrier client — voir le
  // commentaire dans src/app/dashboard/calendrier/page.tsx.
  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col px-4 py-6 sm:px-6">
      <div className="mb-5 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Calendrier
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rendez-vous et commandes pris par téléphone, tous clients confondus.
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <BookingsCalendar scheduled={scheduled} unscheduled={unscheduled} />
      </div>
    </div>
  );
}

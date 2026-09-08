import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingsCalendar } from "@/components/bookings-calendar";
import { toCalendarBookings } from "@/lib/bookings";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { UserAccessCards } from "./user-access-cards";
import { UserSessionsTable } from "./user-sessions-table";
import { UserServicesTable } from "./user-services-table";
import { ServiceHistory } from "./service-history";

export const metadata: Metadata = { title: "Détail utilisateur" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const [currentSession, user, memberships, sessions, clientServices, bookings] = await Promise.all([
    requireAdmin(),
    db.user.findUnique({ where: { id: userId } }),
    db.member.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    }),
    db.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    db.clientService.findMany({
      where: { userId },
      include: {
        service: true,
        organization: true,
        // Le plus récent en premier, comme sur la timeline vue par le
        // client (voir ServiceTimeline).
        events: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.booking.findMany({
      where: { clientService: { userId } },
      include: { clientService: { include: { service: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!user) notFound();

  const isSelf = user.id === currentSession.user.id;

  // Un même utilisateur peut avoir plusieurs organisations/solutions : le
  // nom de la solution complète le nom du client dans le sous-titre, à la
  // différence du calendrier client (une seule solution, pas besoin de le
  // répéter).
  const { scheduled: scheduledBookings, unscheduled: unscheduledBookings } =
    toCalendarBookings(bookings, {
      subtitle: (b) => `${b.clientService.service.name} · ${b.customerPhone}`,
      isSynced: (b) => Boolean(b.googleEventId),
    });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux utilisateurs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {user.name}
          </h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            {user.email}
            {memberships.length > 0 && (
              <span className="flex items-center gap-1 text-sm">
                <Building2 className="size-3.5" aria-hidden="true" />
                {memberships.map((m) => m.organization.name).join(", ")}
              </span>
            )}
          </p>
        </div>
        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
          {user.role ?? "CLIENT"}
        </Badge>
      </div>

      <UserAccessCards user={user} isSelf={isSelf} />
      <UserSessionsTable userId={user.id} userName={user.name} sessions={sessions} />
      <UserServicesTable
        userName={user.name}
        userEmail={user.email}
        clientServices={clientServices}
      />
      <ServiceHistory clientServices={clientServices} />
      {bookings.length > 0 && (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle className="text-base">
              Rendez-vous et commandes
            </CardTitle>
          </CardHeader>
          {/* Hauteur fixe : encarté, le calendrier ne peut pas prendre la
              hauteur de la fenêtre comme sur /admin/calendrier. */}
          <CardContent className="h-[30rem] sm:h-[34rem]">
            <BookingsCalendar
              scheduled={scheduledBookings}
              unscheduled={unscheduledBookings}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

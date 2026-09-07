import { db } from "@/lib/db";
import type {
  Booking,
  CalendarConnection,
  ClientService,
  Service,
  ServiceEvent,
} from "@prisma/client";
import type {
  BookingDTO,
  Configuration,
  MyServiceDTO,
  ServiceDTO,
  ServiceEventDTO,
} from "@/lib/catalog";

function toBookingDTO(booking: Booking): BookingDTO {
  return {
    id: booking.id,
    kind: booking.kind,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    startAt: booking.startAt,
    endAt: booking.endAt,
    googleEventId: booking.googleEventId,
    notes: booking.notes,
    createdAt: booking.createdAt,
  };
}

function toServiceEventDTO(event: ServiceEvent): ServiceEventDTO {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
    createdAt: event.createdAt,
  };
}

// Jointure ClientService + Service -> MyServiceDTO, partagée entre la liste
// « Mes prestations » (dashboard/page.tsx) et la page détail d'une prestation
// (services/[clientServiceId]) pour ne pas dupliquer le mapping des deux
// côtés. `calendarConnection`/`bookings`/`events` sont optionnels : la liste
// ne les charge pas (pas besoin), seule la page détail les inclut.
export function toMyServiceDTO(
  cs: ClientService & {
    service: Service;
    calendarConnection?: CalendarConnection | null;
    bookings?: Booking[];
    events?: ServiceEvent[];
  }
): MyServiceDTO {
  return {
    clientServiceId: cs.id,
    name: cs.name,
    status: cs.status,
    configuration: (cs.configuration as Configuration) ?? {},
    adminNote: cs.adminNote,
    createdAt: cs.createdAt,
    activatedAt: cs.activatedAt,
    canceledAt: cs.canceledAt,
    externalPhoneNumber: cs.externalPhoneNumber,
    calendarConnected: !!cs.calendarConnection,
    whatsappConnected: !!cs.whatsappPhoneNumberId,
    whatsappDisplayNumber: cs.whatsappDisplayNumber,
    bookings: (cs.bookings ?? []).map(toBookingDTO),
    events: (cs.events ?? []).map(toServiceEventDTO),
    service: {
      id: cs.service.id,
      slug: cs.service.slug,
      name: cs.service.name,
      description: cs.service.description,
      category: cs.service.category,
      setupFeeCents: cs.service.setupFeeCents,
      monthlyPriceCents: cs.service.monthlyPriceCents,
      usageCapLabel: cs.service.usageCapLabel,
      configFields: (cs.service.configFields as ServiceDTO["configFields"]) ?? [],
      sortOrder: cs.service.sortOrder,
    },
  };
}

// Renvoie null si la prestation n'existe pas ou n'appartient pas à cet
// utilisateur — le même null couvre les deux cas (404), pour ne pas révéler
// l'existence d'une prestation d'un autre client.
export async function getMyService(
  clientServiceId: string,
  userId: string
): Promise<MyServiceDTO | null> {
  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    include: {
      service: true,
      calendarConnection: true,
      bookings: { orderBy: { createdAt: "desc" }, take: 10 },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!clientService || clientService.userId !== userId) return null;
  return toMyServiceDTO(clientService);
}

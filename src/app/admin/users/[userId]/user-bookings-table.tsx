import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/catalog";

const KIND_LABELS: Record<string, string> = {
  appointment: "Rendez-vous",
  order: "Commande",
};

type BookingRow = {
  id: string;
  kind: string;
  customerName: string;
  customerPhone: string;
  createdAt: Date;
  clientService: { service: { name: string } };
};

export function UserBookingsTable({
  userName,
  bookings,
}: {
  userName: string;
  bookings: BookingRow[];
}) {
  if (bookings.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Rendez-vous et commandes récents
      </h2>
      <Card>
        <CardContent>
          <Table>
            <TableCaption className="sr-only">
              Réservations de {userName}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Prestation</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    {KIND_LABELS[booking.kind] ?? booking.kind}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {booking.clientService.service.name}
                  </TableCell>
                  <TableCell>
                    {booking.customerName}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {booking.customerPhone}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(booking.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

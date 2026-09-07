import Link from "next/link";
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
import { formatDate, formatPrice, type ClientServiceStatus } from "@/lib/catalog";
import { StatusBadge } from "@/components/status-badge";

type ClientServiceRow = {
  id: string;
  name: string;
  status: ClientServiceStatus;
  createdAt: Date;
  service: { name: string; setupFeeCents: number | null; monthlyPriceCents: number | null };
  organization: { name: string };
};

export function UserServicesTable({
  userName,
  userEmail,
  clientServices,
}: {
  userName: string;
  userEmail: string;
  clientServices: ClientServiceRow[];
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Solutions
      </h2>
      <Card>
        {clientServices.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aucune solution activée.
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <Table>
              <TableCaption className="sr-only">
                Solutions de {userName}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Solution</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-right">Demandée le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientServices.map((cs) => (
                  <TableRow key={cs.id}>
                    <TableCell className="font-medium">
                      {cs.name}
                      {cs.name !== cs.service.name && (
                        <p className="text-xs font-normal text-muted-foreground">
                          {cs.service.name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cs.organization.name}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={cs.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(cs.service.setupFeeCents, cs.service.monthlyPriceCents)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(cs.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-sm text-muted-foreground">
              Pour gérer une note ou un numéro de téléphone,{" "}
              <Link
                href={`/admin?q=${encodeURIComponent(userEmail)}`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                retrouvez ce client dans la vue d&apos;ensemble
              </Link>
              .
            </p>
          </CardContent>
        )}
      </Card>
    </section>
  );
}

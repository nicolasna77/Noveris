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
import { RevokeSessionButton } from "../revoke-session-button";

type SessionRow = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  token: string;
};

export function UserSessionsTable({
  userId,
  userName,
  sessions,
}: {
  userId: string;
  userName: string;
  sessions: SessionRow[];
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Sessions (historique de connexion)
      </h2>
      <Card>
        {sessions.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aucune session active.
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <Table>
              <TableCaption className="sr-only">
                Sessions de {userName}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Connecté le</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead>Adresse IP</TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.createdAt)}</TableCell>
                    <TableCell>{formatDate(s.expiresAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                      {s.userAgent ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <RevokeSessionButton userId={userId} sessionToken={s.token} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </section>
  );
}

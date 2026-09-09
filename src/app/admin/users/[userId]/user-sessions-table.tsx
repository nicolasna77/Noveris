import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationNav } from "@/components/pagination-nav";
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

// Même taille de page que partout ailleurs dans l'admin. Un compte ancien
// accumule des dizaines de sessions expirées, qui s'affichaient toutes.
export const SESSIONS_PAGE_SIZE = 20;

type SessionRow = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  token: string;
  // Calculé au chargement des données, pas pendant le rendu : l'heure
  // courante est impure, et un composant doit rendre la même chose à
  // données égales.
  expired: boolean;
};

export function UserSessionsTable({
  userId,
  userName,
  sessions,
  page,
  totalPages,
}: {
  userId: string;
  userName: string;
  sessions: SessionRow[];
  page: number;
  totalPages: number;
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
              Aucune session enregistrée.
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
                  <TableHead>État</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead>Adresse IP</TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id} className={s.expired ? "opacity-60" : undefined}>
                    <TableCell>{formatDate(s.createdAt)}</TableCell>
                    <TableCell>
                      {/* L'opacité seule ne suffirait pas : elle ne dit rien
                          à un lecteur d'écran et se perd en plein soleil sur
                          un écran de téléphone. */}
                      <Badge variant={s.expired ? "outline" : "secondary"}>
                        {s.expired ? "Expirée" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(s.expiresAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                      {s.userAgent ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <RevokeSessionButton
                        userId={userId}
                        sessionToken={s.token}
                        expired={s.expired}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <PaginationNav
              page={page}
              totalPages={totalPages}
              basePath={`/admin/users/${userId}`}
              params={{}}
              label="Pagination des sessions"
            />
          </CardContent>
        )}
      </Card>
    </section>
  );
}
